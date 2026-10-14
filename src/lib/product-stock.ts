import type { Product } from "~/types";

/**
 * Whether a product can currently be bought.
 *
 * Pure and framework-free, so it is safe to call from server components. It
 * previously lived in `~/hooks/use-shop-filters`, which is a `"use client"`
 * module — importing it from a server component threw
 * "Attempted to call isInStock() from the server but isInStock is on the
 * client". `use-shop-filters` now re-exports this, so every existing caller
 * (and its unit tests) keeps working unchanged.
 *
 * Precedence mirrors the product page (`checkProductStatus`) and checkout:
 *   1. pooled base inventory unit    → that unit's backorder flag, else enough
 *      (non-variant products only)     pool units for one sale
 *                                      (`baseUnitsConsumed ?? 1`)
 *   2. not tracking inventory        → always available
 *   3. backorders allowed            → always available
 *   4. variants                      → any variant with stock
 *   5. otherwise                     → the product's own quantity
 *
 * The pool must come first: linking a pool forces the product's own
 * `trackInventory` off (the pool manages stock), so checking that flag first
 * reported every pooled product as in stock even with the pool empty.
 */
export function isInStock(p: Product): boolean {
  const hasVariants = p.variants.length > 0;
  if (!hasVariants && p.baseInventoryUnit) {
    return (
      p.baseInventoryUnit.allowBackorders ||
      p.baseInventoryUnit.inventoryQty >= (p.baseUnitsConsumed ?? 1)
    );
  }
  if (!p.trackInventory) return true;
  if (p.allowBackorders) return true;
  if (hasVariants) {
    return p.variants.some((v) => v.inventoryQty > 0);
  }
  return (p.inventoryQty ?? 0) > 0;
}
