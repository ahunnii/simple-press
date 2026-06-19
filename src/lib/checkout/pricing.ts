import type { CartLineItem, ProductMap, VariantMap } from "./types";

/**
 * Compute the cart subtotal in cents from *server-fetched* prices only — never
 * trust client-supplied amounts. Discounts and free-shipping thresholds are
 * computed against the value returned here.
 *
 * Extracted verbatim from `create-session/route.ts` so it can be unit-tested in
 * isolation; the route calls this instead of inlining the reduce.
 */
export function computeSubtotalCents(
  items: readonly CartLineItem[],
  variantMap: VariantMap,
  productMap: ProductMap,
): number {
  return items.reduce((sum, item) => {
    const serverPrice = item.variantId
      ? (variantMap.get(item.variantId)?.price ?? 0)
      : (productMap.get(item.productId)?.price ?? 0);
    return sum + serverPrice * item.quantity;
  }, 0);
}
