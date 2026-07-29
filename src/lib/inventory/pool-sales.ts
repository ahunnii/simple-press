import type { Prisma } from "generated/prisma";

/**
 * Shape of a row returned by `inventoryHistory.groupBy({ by: ["baseInventoryUnitId", "reason"], ... })`.
 * Kept as a hand-written type (rather than Prisma's generated payload) so
 * `summarizePoolSales` stays a pure function callers can unit test without a DB.
 */
export type PoolLedgerGroupRow = {
  baseInventoryUnitId: string | null;
  reason: string;
  _sum: { changeQty: number | null };
  _count: { _all: number };
};

export type PoolSalesSummary = {
  grossSoldUnits: number;
  returnedUnits: number;
  netSoldUnits: number;
  oversellEvents: number;
};

export const EMPTY_POOL_SALES: PoolSalesSummary = {
  grossSoldUnits: 0,
  returnedUnits: 0,
  netSoldUnits: 0,
  oversellEvents: 0,
};

/**
 * Where-clause for pulling the ledger rows that feed the sales summary.
 *
 * The `orderId: { not: null }` guard applies only to the "return" leg — it
 * distinguishes an order-driven restock (refund/cancel with restock) from an
 * admin manual "return" adjustment made via `adjustInventory`, which carries
 * a `userId` and no `orderId`. Sale/oversell rows are always order-driven
 * (written only by `deductPoolInventory`), so no such guard is needed there.
 */
export function poolSalesWhere(a: {
  businessId: string;
  poolId?: string;
}): Prisma.InventoryHistoryWhereInput {
  return {
    businessId: a.businessId,
    baseInventoryUnitId: a.poolId ?? { not: null },
    OR: [
      { reason: { in: ["sale", "oversell"] } },
      { reason: "return", orderId: { not: null } },
    ],
  };
}

/**
 * Aggregate grouped ledger rows (one row per pool per reason) into a
 * per-pool sales summary. Pools with no matching movement are simply absent
 * from the returned map — callers should default to `EMPTY_POOL_SALES`.
 */
export function summarizePoolSales(
  rows: PoolLedgerGroupRow[],
): Map<string, PoolSalesSummary> {
  const result = new Map<string, PoolSalesSummary>();

  for (const row of rows) {
    const { baseInventoryUnitId: poolId } = row;
    if (poolId === null) continue;

    const changeQty = row._sum.changeQty ?? 0;
    const existing = result.get(poolId) ?? { ...EMPTY_POOL_SALES };

    switch (row.reason) {
      case "sale": {
        existing.grossSoldUnits += -changeQty;
        break;
      }
      case "return": {
        existing.returnedUnits += changeQty;
        break;
      }
      case "oversell": {
        existing.oversellEvents += row._count._all;
        break;
      }
      default:
        break;
    }

    result.set(poolId, existing);
  }

  for (const summary of result.values()) {
    summary.netSoldUnits = summary.grossSoldUnits - summary.returnedUnits;
  }

  return result;
}
