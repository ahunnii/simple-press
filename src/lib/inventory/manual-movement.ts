import { Prisma } from "generated/prisma";
import { TRPCError } from "@trpc/server";

import type { ManualReason } from "./reasons";
import type { DbClient, TxClient } from "~/server/db";

/**
 * The manual inventory ledger: every non-order change to an item's on-hand
 * count (admin adjust, use/restock, CSV import, rental check-out/check-in)
 * goes through here.
 *
 * Server-only in practice (it takes a Prisma transaction), but — like
 * pool-deduction.ts — it carries no `server-only` marker so integration tests
 * and tsx scripts can import it directly.
 *
 * Concurrency contract (READ COMMITTED):
 *  - `lockItems` takes `FOR NO KEY UPDATE` row locks, in id order, inside the
 *    caller's transaction. The order path (deductPoolInventory's guarded
 *    updateMany, restock increments, reserveInventory's raw UPDATE) blocks on
 *    that lock and re-evaluates against the committed row once we commit, so
 *    no quantity is lost and nothing is oversold.
 *  - `NO KEY UPDATE` (not `UPDATE`) so FK inserts that reference the item
 *    (history rows, product links) do not block.
 *  - Locking more than one row uses `NOWAIT`; `withManualInventoryTx` retries
 *    on lock failures. A multi-item manual operation therefore never waits
 *    while holding locks, so it can never deadlock the order path.
 *  - `applyMovement` writes the ABSOLUTE new value computed under the lock, so
 *    its history row's previousQty/newQty are exact.
 */

export type { TxClient };

export type LockedItem = {
  id: string;
  businessId: string;
  name: string;
  itemType: string;
  inventoryQty: number;
  reservedQty: number;
  lowInventoryThreshold: number | null;
  lowInventoryAlertSent: boolean;
  outOfStockAlertSent: boolean;
};

export type InventoryMovementErrorCode =
  | "NOT_FOUND"
  | "EXPECTED_MISMATCH"
  | "INSUFFICIENT_AVAILABLE"
  | "NEGATIVE"
  | "INVALID";

export type InventoryMovementErrorDetails = {
  itemId?: string;
  itemName?: string;
  currentQty?: number;
  available?: number;
  requested?: number;
};

export class InventoryMovementError extends Error {
  readonly code: InventoryMovementErrorCode;
  readonly details?: InventoryMovementErrorDetails;

  constructor(
    code: InventoryMovementErrorCode,
    message?: string,
    details?: InventoryMovementErrorDetails,
  ) {
    super(message ?? code);
    this.name = "InventoryMovementError";
    this.code = code;
    this.details = details;
  }
}

/**
 * Lock the given items (tenant-scoped) for the rest of the transaction.
 * Ids are de-duplicated and locked in id order. Any id that does not exist
 * in `businessId` — including another business's id — throws NOT_FOUND.
 */
export async function lockItems(
  tx: TxClient,
  params: { businessId: string; ids: readonly string[] },
): Promise<Map<string, LockedItem>> {
  const ids = [...new Set(params.ids)].sort();
  const result = new Map<string, LockedItem>();
  if (ids.length === 0) return result;

  const rows = await tx.$queryRaw<LockedItem[]>(Prisma.sql`
    SELECT "id", "businessId", "name", "itemType", "inventoryQty", "reservedQty",
           "lowInventoryThreshold", "lowInventoryAlertSent", "outOfStockAlertSent"
    FROM "BaseInventoryUnit"
    WHERE "id" IN (${Prisma.join(ids)})
      AND "businessId" = ${params.businessId}
    ORDER BY "id"
    FOR NO KEY UPDATE${ids.length > 1 ? Prisma.sql` NOWAIT` : Prisma.empty}
  `);

  for (const row of rows) result.set(row.id, row);
  const missing = ids.find((id) => !result.has(id));
  if (missing !== undefined) {
    throw new InventoryMovementError("NOT_FOUND", "Item not found", {
      itemId: missing,
    });
  }
  return result;
}

export type Movement =
  | { mode: "set"; quantity: number; expectedQty?: number }
  | { mode: "delta"; delta: number; guard: "available" | "none" };

export type ApplyMovementParams = {
  movement: Movement;
  reason: ManualReason;
  note?: string | null;
  userId: string | null;
  checkoutId?: string | null;
  /** Skip the write (and history row) when the quantity would not change. */
  skipIfUnchanged?: boolean;
};

export type ApplyMovementResult = {
  previousQty: number;
  newQty: number;
  changeQty: number;
  historyId: string | null;
};

function computeNewQty(item: LockedItem, movement: Movement): number {
  const details = { itemId: item.id, itemName: item.name };
  if (movement.mode === "set") {
    const { quantity, expectedQty } = movement;
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new InventoryMovementError(
        "INVALID",
        "Quantity must be a whole number of 0 or more",
        details,
      );
    }
    if (expectedQty !== undefined && expectedQty !== item.inventoryQty) {
      throw new InventoryMovementError(
        "EXPECTED_MISMATCH",
        `The count changed to ${item.inventoryQty}`,
        { ...details, currentQty: item.inventoryQty },
      );
    }
    return quantity;
  }

  const { delta, guard } = movement;
  if (!Number.isInteger(delta) || delta === 0) {
    throw new InventoryMovementError(
      "INVALID",
      "Change must be a non-zero whole number",
      details,
    );
  }
  if (guard === "available") {
    if (delta > 0) {
      throw new InventoryMovementError(
        "INVALID",
        "The available guard only applies to removals",
        details,
      );
    }
    // Never take units a storefront checkout is holding (reservedQty).
    const available = item.inventoryQty - item.reservedQty;
    if (-delta > available) {
      throw new InventoryMovementError(
        "INSUFFICIENT_AVAILABLE",
        `Only ${Math.max(0, available)} available`,
        { ...details, available: Math.max(0, available), requested: -delta },
      );
    }
    return item.inventoryQty + delta;
  }
  const newQty = item.inventoryQty + delta;
  // A positive delta is always allowed, even onto a pool that backorders have
  // taken negative; a removal may not push the count below zero.
  if (delta < 0 && newQty < 0) {
    throw new InventoryMovementError(
      "NEGATIVE",
      "That would take the count below zero",
      { ...details, currentQty: item.inventoryQty, requested: -delta },
    );
  }
  return newQty;
}

/**
 * Apply one movement to an item locked by `lockItems` in the same `tx`.
 * Writes the absolute new quantity (plus today's `adjustInventory` alert-flag
 * reset rule) and exactly one history row, then updates `item` in place so
 * further movements in the same transaction chain from the new value.
 */
export async function applyMovement(
  tx: TxClient,
  item: LockedItem,
  params: ApplyMovementParams,
): Promise<ApplyMovementResult> {
  const previousQty = item.inventoryQty;
  const newQty = computeNewQty(item, params.movement);
  const changeQty = newQty - previousQty;

  if (params.skipIfUnchanged && changeQty === 0) {
    return { previousQty, newQty, changeQty, historyId: null };
  }

  // Same rule adjustInventory has always used, evaluated on the LOCKED row.
  const alertReset: {
    outOfStockAlertSent?: boolean;
    lowInventoryAlertSent?: boolean;
  } = {};
  if (item.outOfStockAlertSent && newQty > 0) {
    alertReset.outOfStockAlertSent = false;
  }
  if (
    item.lowInventoryAlertSent &&
    item.lowInventoryThreshold !== null &&
    newQty > item.lowInventoryThreshold
  ) {
    alertReset.lowInventoryAlertSent = false;
  }

  await tx.baseInventoryUnit.update({
    where: { id: item.id },
    data: { inventoryQty: newQty, ...alertReset },
  });

  const history = await tx.inventoryHistory.create({
    data: {
      baseInventoryUnitId: item.id,
      businessId: item.businessId,
      previousQty,
      newQty,
      changeQty,
      reason: params.reason,
      note: params.note ?? null,
      userId: params.userId,
      checkoutId: params.checkoutId ?? null,
    },
    select: { id: true },
  });

  item.inventoryQty = newQty;
  if (alertReset.outOfStockAlertSent === false)
    item.outOfStockAlertSent = false;
  if (alertReset.lowInventoryAlertSent === false) {
    item.lowInventoryAlertSent = false;
  }

  return { previousQty, newQty, changeQty, historyId: history.id };
}

/**
 * Record damaged/lost rental units. They already left `inventoryQty` at
 * check-out, so the row is informational: changeQty 0, prev = new.
 */
export async function recordWriteOff(
  tx: TxClient,
  item: LockedItem,
  params: {
    reason: "damage" | "lost";
    qty: number;
    note?: string | null;
    userId: string | null;
    checkoutId?: string | null;
  },
): Promise<{ historyId: string }> {
  if (!Number.isInteger(params.qty) || params.qty <= 0) {
    throw new InventoryMovementError(
      "INVALID",
      "Write-off quantity must be a positive whole number",
      { itemId: item.id, itemName: item.name },
    );
  }
  const word = params.reason === "lost" ? "lost" : "damaged";
  const trimmed = params.note?.trim();
  const note = trimmed
    ? `${params.qty} ${word} — ${trimmed}`
    : `${params.qty} unit(s) not returned (${params.reason})`;

  const history = await tx.inventoryHistory.create({
    data: {
      baseInventoryUnitId: item.id,
      businessId: item.businessId,
      previousQty: item.inventoryQty,
      newQty: item.inventoryQty,
      changeQty: 0,
      reason: params.reason,
      note,
      userId: params.userId,
      checkoutId: params.checkoutId ?? null,
    },
    select: { id: true },
  });
  return { historyId: history.id };
}

const RETRYABLE_PG_CODES = new Set([
  "55P03", // lock_not_available: NOWAIT failure or lock_timeout
  "40P01", // deadlock_detected
  "40001", // serialization_failure
]);

/**
 * True for errors worth retrying the whole transaction for. Shapes observed
 * against Postgres with Prisma 6:
 *  - `$queryRaw` NOWAIT / lock_timeout / deadlock:
 *    PrismaClientKnownRequestError `code: "P2010"`,
 *    `meta.code: "55P03" | "40P01"`.
 *  - ORM query (e.g. `tx.model.update`) hitting lock_timeout:
 *    PrismaClientUnknownRequestError whose message contains
 *    `PostgresError { code: "55P03", ... }`.
 *  - Prisma's own write-conflict/deadlock: KnownRequestError `code: "P2034"`.
 */
export function isRetryableLockError(err: unknown): boolean {
  if (err instanceof InventoryMovementError) return false;
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2034") return true;
    if (err.code === "P2010") {
      const pgCode = (err.meta as { code?: unknown } | undefined)?.code;
      return typeof pgCode === "string" && RETRYABLE_PG_CODES.has(pgCode);
    }
    return false;
  }
  if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    const match = /PostgresError \{ code: "([0-9A-Z]{5})"/.exec(err.message);
    return match?.[1] !== undefined && RETRYABLE_PG_CODES.has(match[1]);
  }
  return false;
}

export const INVENTORY_BUSY_MESSAGE = "Inventory is busy — try again.";

export type ManualInventoryTxOptions = {
  /** Total attempts including the first (default 4). */
  maxAttempts?: number;
  /** Awaited after a retryable failure, before the backoff sleep. For tests. */
  onRetry?: (info: { attempt: number; error: unknown }) => void | Promise<void>;
};

/**
 * Run `fn` in an interactive transaction with a 5s lock_timeout, retrying the
 * whole transaction (jittered 50–400ms backoff, 4 attempts total) on lock
 * failures. `fn` must be safe to re-run: keep side effects inside `tx`.
 * Exhausted retries → TRPCError CONFLICT. InventoryMovementError and every
 * other error propagate immediately.
 */
export async function withManualInventoryTx<T>(
  db: DbClient,
  fn: (tx: TxClient) => Promise<T>,
  options: ManualInventoryTxOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 4;
  for (let attempt = 1; ; attempt++) {
    try {
      return await db.$transaction(
        async (tx) => {
          await tx.$executeRawUnsafe("SET LOCAL lock_timeout = '5s'");
          return fn(tx);
        },
        { maxWait: 5000, timeout: 15000 },
      );
    } catch (err) {
      if (!isRetryableLockError(err)) throw err;
      if (attempt >= maxAttempts) {
        throw new TRPCError({
          code: "CONFLICT",
          message: INVENTORY_BUSY_MESSAGE,
          cause: err,
        });
      }
      await options.onRetry?.({ attempt, error: err });
      await new Promise((r) => setTimeout(r, 50 + Math.random() * 350));
    }
  }
}

export function toTrpcError(err: InventoryMovementError): TRPCError {
  const name = err.details?.itemName;
  switch (err.code) {
    case "NOT_FOUND":
      return new TRPCError({
        code: "NOT_FOUND",
        message: "Item not found",
        cause: err,
      });
    case "EXPECTED_MISMATCH":
      return new TRPCError({
        code: "CONFLICT",
        message: `The count changed to ${err.details?.currentQty ?? "a new value"} since you opened this — review and re-enter.`,
        cause: err,
      });
    case "INSUFFICIENT_AVAILABLE":
      return new TRPCError({
        code: "BAD_REQUEST",
        message: `Only ${err.details?.available ?? 0} available${name ? ` for ${name}` : ""}`,
        cause: err,
      });
    case "NEGATIVE":
      return new TRPCError({
        code: "BAD_REQUEST",
        message: `That would take ${name ?? "the count"} below zero`,
        cause: err,
      });
    case "INVALID":
      return new TRPCError({
        code: "BAD_REQUEST",
        message: err.message,
        cause: err,
      });
  }
}

/** For router catch blocks: map InventoryMovementError to TRPCError, rethrow anything else. */
export function rethrowMovementError(err: unknown): never {
  if (err instanceof InventoryMovementError) throw toTrpcError(err);
  throw err;
}
