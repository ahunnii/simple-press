import type {
  BaseInventoryUnit,
  Product,
  ProductVariant,
} from "generated/prisma";

import { getEffectiveCompareAtPrice, getEffectivePrice } from "~/lib/prices";
import { parseCardAdditionalFields } from "~/lib/products";

export function useProductCard(
  product: Product & { variants: ProductVariant[] } & {
    baseInventoryUnit: Partial<BaseInventoryUnit> | null;
  },
) {
  const { comingSoon } = parseCardAdditionalFields(product.additionalFields);

  const hasVariants = product.variants.length > 0;

  // Pool inventory only applies to products without variants
  const poolEffectiveMaxQty =
    !hasVariants && product.baseInventoryUnit
      ? Math.floor(
          (product.baseInventoryUnit.inventoryQty ?? 0) /
            (product.baseUnitsConsumed ?? 1),
        )
      : null;

  const displayPrice = getEffectivePrice(product);
  const displayCompareAtPrice = getEffectiveCompareAtPrice(product);
  const isOnSale =
    displayCompareAtPrice !== null &&
    displayCompareAtPrice > 0 &&
    displayCompareAtPrice > displayPrice;

  // Out of stock logic differs by product type:
  // - Variants: tracking enabled and every variant has 0 qty
  // - Pooled: pool quantity depleted
  // - Simple: tracking enabled with 0 qty and no backorders
  const isOutOfStock = hasVariants
    ? !!product.trackInventory &&
      !product.allowBackorders &&
      product.variants.every((v) => v.inventoryQty === 0)
    : poolEffectiveMaxQty !== null
      ? poolEffectiveMaxQty <= 0
      : !!product.trackInventory &&
        !product.allowBackorders &&
        (product.inventoryQty ?? 0) === 0;

  // Backorder only applies to simple inventory products
  const isBackorder =
    !hasVariants &&
    poolEffectiveMaxQty === null &&
    !!product.trackInventory &&
    !!product.allowBackorders &&
    (product.inventoryQty ?? 0) === 0;

  // Cart is disabled if coming soon, out of stock, or requires variant selection
  const disableCart = !!comingSoon || isOutOfStock || hasVariants;

  // Max inventory cap passed to addItem for client-side validation
  const maxInventory =
    poolEffectiveMaxQty ??
    (product.trackInventory && !product.allowBackorders
      ? (product.inventoryQty ?? undefined)
      : undefined);

  return {
    displayPrice,
    displayCompareAtPrice,
    isOnSale,
    hasVariants,
    poolEffectiveMaxQty,
    isOutOfStock,
    isBackorder,
    comingSoon: !!comingSoon,
    disableCart,
    maxInventory,
  };
}
