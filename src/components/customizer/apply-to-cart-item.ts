import type { ProductCustomizerController } from "./use-product-customizer";

/**
 * Wrap a plain add-to-cart payload (`buildVariantCartItem`, `useProduct`'s)
 * into a configured line: the build's add-ons on top of the price (and the
 * compare-at price, matching the server's cart status check), plus the
 * `configuration` / `configKey` / display `customization` fields.
 *
 * Returns the item unchanged when there is no customizer or nothing was
 * chosen, so a product whose options are all optional and untouched adds a
 * plain line. The server re-prices the configuration either way.
 */
export function applyCustomizerToCartItem<
  T extends { price: number; compareAtPrice?: number | null },
>(item: T, controller: ProductCustomizerController) {
  const fields = controller.toCartFields();
  if (!fields) return item;
  const addOns = controller.addOnTotal;
  return {
    ...item,
    price: item.price + addOns,
    compareAtPrice:
      item.compareAtPrice != null ? item.compareAtPrice + addOns : null,
    ...fields,
  };
}
