import { Prisma } from "generated/prisma";

import type { DbClient, TxClient } from "~/server/db";

type Tx = TxClient;

export type ReservationEntry = {
  variantId?: string | null;
  productId?: string | null;
  baseInventoryUnitId?: string | null;
  qty: number;
};

/**
 * Atomically reserve inventory for the given entries.
 * Uses raw SQL conditional UPDATE so the reserve only succeeds when
 * (inventoryQty - reservedQty) >= qty, closing the oversell window.
 *
 * Returns { ok: true } when all entries reserved successfully.
 * Returns { ok: false } when any entry fails (not enough available stock).
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
): Promise<{ ok: true } | { ok: false }> {
  const { entries } = params;

  for (const entry of entries) {
    const qty = entry.qty;

    if (entry.variantId) {
      // Reserve against ProductVariant
      const result = await tx.$executeRaw(
        Prisma.sql`
          UPDATE "ProductVariant"
          SET "reservedQty" = "reservedQty" + ${qty}
          WHERE id = ${entry.variantId}
            AND ("inventoryQty" - "reservedQty") >= ${qty}
        `,
      );
      if (result === 0) return { ok: false };
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
      if (result === 0) return { ok: false };
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
      if (result === 0) return { ok: false };
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
  for (const staleRes of stale) {
    await db.$transaction(async (tx) => {
      const entries = staleRes.items as ReservationEntry[];
      await releaseReservation(tx, { items: entries });
      await tx.inventoryReservation.update({
        where: { id: staleRes.id },
        data: { status: "released" },
      });
    });
  }
  return stale.length;
}

/**
 * Release a reservation by decrementing reservedQty for each entry.
 * Uses GREATEST(..., 0) to guard against underflow.
 *
 * Idempotency is the CALLER's responsibility — only call when
 * reservation.status === "active".
 *
 * Must be called inside an existing db.$transaction.
 */
export async function releaseReservation(
  tx: Tx,
  reservation: {
    items: ReservationEntry[];
  },
): Promise<void> {
  for (const entry of reservation.items) {
    const qty = entry.qty;

    if (entry.variantId) {
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
