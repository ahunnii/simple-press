/**
 * InventoryHistory `reason` vocabulary — pure and client-safe (no server
 * imports), shared by the ledger helpers, routers and admin UI.
 *
 * Two disjoint worlds write to the same ledger:
 *  - ORDER-driven rows (`sale`, `oversell`, `return` with an `orderId`) come
 *    only from the frozen order path (pool-deduction / order-deduction) and are
 *    what `poolSalesWhere` counts as sales.
 *  - MANUAL rows come from `manual-movement.ts`. They must never use `sale` or
 *    `oversell`, or they would leak into sales totals. `return` is shared, but
 *    manual returns carry no `orderId` and `poolSalesWhere` excludes them.
 */

export const ORDER_LEDGER_REASONS = ["sale", "oversell", "return"] as const;
export type OrderLedgerReason = (typeof ORDER_LEDGER_REASONS)[number];

export const MANUAL_REASONS = [
  "adjustment",
  "correction",
  "damage",
  "return",
  "restock",
  "used",
  "import",
  "checkout",
  "checkin",
  "lost",
  "initial",
] as const;
export type ManualReason = (typeof MANUAL_REASONS)[number];

export const REASON_LABELS: Record<string, string> = {
  sale: "Sale",
  oversell: "Oversell (not deducted)",
  return: "Return",
  adjustment: "Adjustment",
  correction: "Correction",
  damage: "Damaged",
  restock: "Restock",
  used: "Used",
  import: "Import",
  checkout: "Checked out",
  checkin: "Checked in",
  lost: "Lost",
  initial: "Initial count",
};

/** Human label for a ledger reason; unknown values are title-cased. */
export function reasonLabel(reason: string): string {
  const known = REASON_LABELS[reason];
  if (known) return known;
  return reason
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
