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
 * Precedence mirrors the checkout's server-side validation:
 *   1. not tracking inventory        → always available
 *   2. backorders allowed            → always available
 *   3. pooled base inventory unit    → that unit's backorder flag / quantity
 *   4. variants                      → any variant with stock
 *   5. otherwise                     → the product's own quantity
 */
export function isInStock(p: Product): boolean {
  if (!p.trackInventory) return true;
  if (p.allowBackorders) return true;
  if (p.baseInventoryUnit) {
    return (
      p.baseInventoryUnit.allowBackorders ||
      p.baseInventoryUnit.inventoryQty > 0
    );
  }
  if (p.variants.length > 0) {
    return p.variants.some((v) => v.inventoryQty > 0);
  }
  return (p.inventoryQty ?? 0) > 0;
}
