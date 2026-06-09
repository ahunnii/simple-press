import { Prisma } from "generated/prisma";

import type { TxClient } from "~/server/db";

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
