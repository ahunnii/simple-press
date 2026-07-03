/**
 * Shared "is this variant purchasable" predicate + initial-selection helper.
 *
 * Mirrors the semantics in `checkProductStatus` (src/lib/products/check-product-status.ts):
 * trackInventory / allowBackorders live on the PRODUCT, not the variant, so a
 * variant is only considered unavailable when the product tracks inventory,
 * does NOT allow backorders, and that variant's own qty is depleted.
 * Untracked or backorderable variants are always purchasable regardless of qty.
 */

export type PurchasabilityContext = {
  trackInventory: boolean;
  allowBackorders: boolean;
};

export function isVariantPurchasable<V extends { inventoryQty: number }>(
  variant: V,
  product: PurchasabilityContext,
): boolean {
  return !(
    product.trackInventory &&
    !product.allowBackorders &&
    variant.inventoryQty <= 0
  );
}

/**
 * Picks the variant that should be preselected on initial product-page load:
 * the first purchasable variant, falling back to `variants[0]` (so the
 * existing sold-out UI still shows when every variant is unavailable), and
 * finally `null` when there are no variants at all.
 */
export function pickInitialVariant<V extends { inventoryQty: number }>(
  variants: V[],
  product: PurchasabilityContext,
): V | null {
  const firstPurchasable = variants.find((v) =>
    isVariantPurchasable(v, product),
  );
  return firstPurchasable ?? variants[0] ?? null;
}
