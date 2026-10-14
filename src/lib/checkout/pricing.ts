import type { CartLineItem, ProductMap, VariantMap } from "./types";
import { resolveVariantPrice } from "~/lib/variant-price";

/**
 * Compute the cart subtotal in cents from *server-fetched* prices only — never
 * trust client-supplied amounts. Discounts and free-shipping thresholds are
 * computed against the value returned here.
 *
 * Extracted verbatim from `create-session/route.ts` so it can be unit-tested in
 * isolation; the route calls this instead of inlining the reduce.
 *
 * `unitPriceOverrides` (line index → unit cents) replaces the catalog price
 * for configured lines (product customizer): base + add-ons, as priced
 * server-side by `priceConfiguration`. Lines without an entry are unchanged.
 */
export function computeSubtotalCents(
  items: readonly CartLineItem[],
  variantMap: VariantMap,
  productMap: ProductMap,
  unitPriceOverrides?: ReadonlyMap<number, number>,
): number {
  return items.reduce((sum, item, index) => {
    let serverPrice: number;
    const override = unitPriceOverrides?.get(index);
    if (override !== undefined) {
      serverPrice = override;
    } else if (item.variantId) {
      const variant = variantMap.get(item.variantId);
      // Fall back to 0 only when the record is missing entirely; a variant
      // priced 0/null inherits its product's base price.
      serverPrice = variant
        ? resolveVariantPrice(variant.price, variant.product.price)
        : 0;
    } else {
      serverPrice = productMap.get(item.productId)?.price ?? 0;
    }
    return sum + serverPrice * item.quantity;
  }, 0);
}
