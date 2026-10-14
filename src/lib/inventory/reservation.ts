import { Prisma } from "generated/prisma";

import type { DbClient, TxClient } from "~/server/db";

type Tx = TxClient;

/**
 * One line of an `InventoryReservation.items` array. Stock entries carry one of
 * `variantId` / `baseInventoryUnitId` / `productId`; a DISCOUNT entry carries
 * `discountCodeId` (qty 1) instead — a discount-code use held for the checkout
 * exactly like a unit of stock (see `reserveInventory`).
 */
export type ReservationEntry = {
  variantId?: string | null;
  productId?: string | null;
  baseInventoryUnitId?: string | null;
  /**
   * A discount-code use claimed at checkout start. `usageCount` was already
   * incremented for it; releasing the reservation gives the use back,
   * consuming it (order created) makes it final.
   */
  discountCodeId?: string | null;
  /**
   * Shopper email (normalized) on a discount entry, so the per-customer limit
   * can count this shopper's still-open checkouts as well as their orders.
   */
  customerEmail?: string | null;
  qty: number;
};

export type ReserveResult =
  | { ok: true }
  | {
      ok: false;
      /** "stock": a stock entry lacked available units. "discount": the
       *  discount code had no uses left (or is not this business's). */
      reason: "stock" | "discount";
    };

/**
 * How long a cart's stock hold is kept once checkout completes with a delayed
 * payment method (ACH bank debit, bank transfer, voucher) — the webhook
 * extends the reservation's `expiresAt` to now + this on
 * `checkout.session.completed` with `payment_status: "unpaid"`.
 *
 * ACH typically settles in ~4 business days; other delayed methods can take
 * longer, hence two weeks. The outcome event normally settles the hold first
 * (`async_payment_succeeded` consumes it, `async_payment_failed` releases it).
 * If no outcome event ever arrives, `sweepStaleReservations` releases it at
 * expiry like any other stale hold. A success that arrives after that still
 * creates the order — the inventory deduction's existing oversell guard
 * handles the case where the stock has since been sold to someone else.
 */
export const ASYNC_PAYMENT_HOLD_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Atomically reserve inventory for the given entries.
 * Uses raw SQL conditional UPDATE so the reserve only succeeds when
 * (inventoryQty - reservedQty) >= qty, closing the oversell window.
 *
 * A discount entry claims one use of the code the same way: `usageCount` is
 * incremented only while it is under `usageLimit` (and only for a code owned
 * by `businessId`), so two open checkouts can never both hold the last use of
 * a limited code — including a single-use loyalty reward code. The use is
 * counted from checkout start, not from order creation, because a delayed
 * (bank) payment can stay open for days.
 *
 * Returns { ok: true } when all entries reserved successfully.
 * Returns { ok: false, reason } when any entry fails — "stock" for a stock
 * entry, "discount" for a discount entry.
 * The CALLER is responsible for rolling back the transaction on { ok: false }.
 *
 * Must be called inside an existing db.$transaction.
 */
export async function reserveInventory(
  tx: Tx,
  params: {
    entries: ReservationEntry[];
    businessId: string;
  },
): Promise<ReserveResult> {
  const { entries, businessId } = params;

  for (const entry of entries) {
    const qty = entry.qty;

    if (entry.discountCodeId) {
      const result = await tx.$executeRaw(
        Prisma.sql`
          UPDATE "DiscountCode"
          SET "usageCount" = "usageCount" + ${qty},
              "updatedAt" = NOW()
          WHERE id = ${entry.discountCodeId}
            AND "businessId" = ${businessId}
            AND ("usageLimit" IS NULL OR "usageCount" + ${qty} <= "usageLimit")
        `,
      );
      if (result === 0) return { ok: false, reason: "discount" };
    } else if (entry.variantId) {
      // Reserve against ProductVariant
      const result = await tx.$executeRaw(
        Prisma.sql`
          UPDATE "ProductVariant"
          SET "reservedQty" = "reservedQty" + ${qty}
          WHERE id = ${entry.variantId}
            AND ("inventoryQty" - "reservedQty") >= ${qty}
        `,
      );
      if (result === 0) return { ok: false, reason: "stock" };
    } else if (entry.baseInventoryUnitId) {
      // Reserve against BaseInventoryUnit (pool)
      const result = await tx.$executeRaw(
        Prisma.sql`
          UPDATE "BaseInventoryUnit"
          SET "reservedQty" = "reservedQty" + ${qty}
          WHERE id = ${entry.baseInventoryUnitId}
            AND ("inventoryQty" - "reservedQty") >= ${qty}
        `,
      );
      if (result === 0) return { ok: false, reason: "stock" };
    } else if (entry.productId) {
      // Reserve against Product (no variant, no pool)
      const result = await tx.$executeRaw(
        Prisma.sql`
          UPDATE "Product"
          SET "reservedQty" = "reservedQty" + ${qty}
          WHERE id = ${entry.productId}
            AND ("inventoryQty" - "reservedQty") >= ${qty}
        `,
      );
      if (result === 0) return { ok: false, reason: "stock" };
    }
  }

  return { ok: true };
}

/**
 * Release any stale reservations — rows still "active" past their expiresAt —
 * so they stop inflating reservedQty. Each reservation is released in its own
 * transaction so one failure doesn't block the rest.
 *
 * Optionally scoped to a single business (the create-session lazy sweep);
 * unscoped it sweeps platform-wide (the cron job).
 *
 * Returns the number of reservations released.
 */
export async function sweepStaleReservations(
  db: DbClient,
  opts: { businessId?: string; take?: number } = {},
): Promise<number> {
  const stale = await db.inventoryReservation.findMany({
    where: {
      ...(opts.businessId ? { businessId: opts.businessId } : {}),
      status: "active",
      expiresAt: { lt: new Date() },
    },
    take: opts.take ?? 50,
  });
  let released = 0;
  for (const staleRes of stale) {
    // The row was "active" when read above, but another writer (an
    // expired/async-failed webhook releasing it, the completed path consuming
    // it) may have settled it since. The conditional `active → released` flip
    // is the gate: only the writer that wins it decrements reservedQty.
    const didRelease = await db.$transaction(async (tx) => {
      const flipped = await tx.inventoryReservation.updateMany({
        where: { id: staleRes.id, status: "active" },
        data: { status: "released" },
      });
      if (flipped.count === 0) return false;
      await releaseReservation(
        tx,
        { items: staleRes.items as ReservationEntry[] },
        { mode: "release" },
      );
      return true;
    });
    if (didRelease) released++;
  }
  return released;
}

/**
 * Settle a reservation's entries. Stock entries always drop their reservedQty
 * hold (GREATEST(..., 0) guards against underflow). Discount entries depend on
 * `mode`:
 *
 * - `"release"` — the checkout did NOT become an order (session expired,
 *   delayed payment failed, stale sweep, Stripe session never created): the
 *   held discount use is given back (`usageCount - 1`, floored at 0).
 * - `"consume"` — the order was created: the physical stock deduction has
 *   already happened, so only reservedQty drops; the discount use counted at
 *   checkout start becomes final and `usageCount` is left alone.
 *
 * `mode` is required so every call site states which settlement it is.
 *
 * Idempotency is the CALLER's responsibility — only call after winning the
 * conditional `active → released/consumed` flip on the reservation row.
 *
 * Must be called inside an existing db.$transaction.
 */
export async function releaseReservation(
  tx: Tx,
  reservation: {
    items: ReservationEntry[];
  },
  opts: { mode: "release" | "consume" },
): Promise<void> {
  for (const entry of reservation.items) {
    const qty = entry.qty;

    if (entry.discountCodeId) {
      if (opts.mode === "consume") continue;
      await tx.$executeRaw(
        Prisma.sql`
          UPDATE "DiscountCode"
          SET "usageCount" = GREATEST("usageCount" - ${qty}, 0),
              "updatedAt" = NOW()
          WHERE id = ${entry.discountCodeId}
        `,
      );
    } else if (entry.variantId) {
      await tx.$executeRaw(
        Prisma.sql`
          UPDATE "ProductVariant"
          SET "reservedQty" = GREATEST("reservedQty" - ${qty}, 0)
          WHERE id = ${entry.variantId}
        `,
      );
    } else if (entry.baseInventoryUnitId) {
      await tx.$executeRaw(
        Prisma.sql`
          UPDATE "BaseInventoryUnit"
          SET "reservedQty" = GREATEST("reservedQty" - ${qty}, 0)
          WHERE id = ${entry.baseInventoryUnitId}
        `,
      );
    } else if (entry.productId) {
      await tx.$executeRaw(
        Prisma.sql`
          UPDATE "Product"
          SET "reservedQty" = GREATEST("reservedQty" - ${qty}, 0)
          WHERE id = ${entry.productId}
        `,
      );
    }
  }
}

/**
 * Discount-code uses currently HELD by open checkouts — `active` reservations
 * carrying a discount entry — per code. These uses are already included in
 * `DiscountCode.usageCount` (counted at checkout start) but are not final: if
 * the checkout expires or its payment fails the use is given back. So
 * `usageCount - held` is the number of uses that are final.
 *
 * Includes active holds already past `expiresAt` that no sweep has released
 * yet — their use is still inside `usageCount` until the release runs.
 *
 * With `customerEmail`, counts only that shopper's holds (per-customer limit).
 * With `discountCodeIds`, only those codes are counted (an empty list returns
 * an empty map without querying).
 */
export async function countHeldDiscountUses(
  db: DbClient | TxClient,
  opts: {
    businessId: string;
    discountCodeIds?: string[];
    customerEmail?: string;
  },
): Promise<Map<string, number>> {
  if (opts.discountCodeIds?.length === 0) return new Map();
  const rows = await db.$queryRaw<
    Array<{ discountCodeId: string; held: number }>
  >(Prisma.sql`
    SELECT e->>'discountCodeId' AS "discountCodeId",
           COALESCE(SUM((e->>'qty')::int), 0)::int AS held
    FROM "InventoryReservation" r
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(r.items) = 'array' THEN r.items ELSE '[]'::jsonb END
    ) AS e
    WHERE r."businessId" = ${opts.businessId}
      AND r.status = 'active'
      AND e->>'discountCodeId' IS NOT NULL
      ${
        opts.discountCodeIds
          ? Prisma.sql`AND e->>'discountCodeId' IN (${Prisma.join(opts.discountCodeIds)})`
          : Prisma.empty
      }
      ${
        opts.customerEmail !== undefined
          ? Prisma.sql`AND e->>'customerEmail' = ${opts.customerEmail}`
          : Prisma.empty
      }
    GROUP BY 1
  `);
  return new Map(rows.map((r) => [r.discountCodeId, Number(r.held)]));
}
