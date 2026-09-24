import type { DbClient, TxClient } from "~/server/db";
import { todayUtcMidnight } from "~/lib/invoices/status";

/**
 * Rental check-out helpers. "Out" is always computed from OPEN check-out
 * lines, never stored, so it cannot drift from the lines themselves.
 * `lineOutstanding` and `isCheckoutOverdue` are pure and client-safe.
 */

export type CheckoutLineQuantities = {
  qtyOut: number;
  qtyReturned: number;
  qtyDamaged: number;
  qtyLost: number;
};

/** Units on a line that have not come back yet (returned, damaged or lost). */
export function lineOutstanding(line: CheckoutLineQuantities): number {
  return line.qtyOut - line.qtyReturned - line.qtyDamaged - line.qtyLost;
}

/**
 * Outstanding units per item across all OPEN check-outs of a business.
 * Only items with outstanding > 0 appear — read with `map.get(id) ?? 0`.
 * Pass `itemIds` to restrict the lookup (an empty array returns an empty map).
 */
export async function getOutstandingByItem(
  db: DbClient | TxClient,
  businessId: string,
  itemIds?: readonly string[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (itemIds?.length === 0) return result;

  const rows = await db.inventoryCheckoutLine.groupBy({
    by: ["itemId"],
    where: {
      businessId,
      itemId: itemIds ? { in: [...itemIds] } : { not: null },
      checkout: { status: "open" },
    },
    _sum: { qtyOut: true, qtyReturned: true, qtyDamaged: true, qtyLost: true },
  });

  for (const row of rows) {
    if (!row.itemId) continue;
    const outstanding = lineOutstanding({
      qtyOut: row._sum.qtyOut ?? 0,
      qtyReturned: row._sum.qtyReturned ?? 0,
      qtyDamaged: row._sum.qtyDamaged ?? 0,
      qtyLost: row._sum.qtyLost ?? 0,
    });
    if (outstanding > 0) result.set(row.itemId, outstanding);
  }
  return result;
}

/**
 * Overdue: still open and the due-back date is BEFORE today in the business's
 * zone. `dueBackOn` is a calendar date stored at UTC midnight (the
 * `Invoice.dueDate` convention), so "due 9/30" is not overdue until 10/1
 * locally — see `isInvoiceOverdue`.
 */
export function isCheckoutOverdue(
  checkout: { status: string; dueBackOn: Date | null },
  now: Date,
  timeZone: string,
): boolean {
  if (checkout.status !== "open" || !checkout.dueBackOn) return false;
  return (
    checkout.dueBackOn.getTime() < todayUtcMidnight(now, timeZone).getTime()
  );
}
