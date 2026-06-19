import {
  computeSavingsLabel,
  getEffectiveCompareAtPrice,
  getEffectivePrice,
} from "~/lib/prices";
import { parseCardAdditionalFields } from "~/lib/products";

export type ProductStatusInput = {
  price: number;
  compareAtPrice: number | null;
  trackInventory: boolean;
  inventoryQty: number;
  allowBackorders: boolean;
  baseInventoryUnit: { inventoryQty: number } | null;
  baseUnitsConsumed: number | null;
  additionalFields: unknown;
  variants: Array<{
    price: number | null;
    compareAtPrice: number | null;
    inventoryQty: number;
  }>;
};

export type ProductStatus = {
  isOnSale: boolean;
  isOutOfStock: boolean;
  isBackorder: boolean;
  comingSoon: boolean;
  hasVariants: boolean;
  poolEffectiveMaxQty: number | null;
  /** "Coming Soon" | "Sale" | "Out of Stock" | "Pre-order" | null */
  badgeLabel: string | null;
  /** "Save 20%" — only set when isOnSale */
  savingsLabel: string | null;
  disableCart: boolean;
  variablePricing: boolean;
  maxInventory: number | undefined;
  displayPrice: number;
  displayCompareAtPrice: number | null;
};

export function checkProductStatus(product: ProductStatusInput): ProductStatus {
  const { comingSoon } = parseCardAdditionalFields(product.additionalFields);
  const hasVariants = product.variants.length > 0;

  // Pool inventory only applies to simple (non-variant) products
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

  // Out-of-stock logic by product type:
  // - Variant: tracking on and ALL variants are at 0 (partial OOS = no badge)
  // - Pooled: pool qty depleted
  // - Simple: tracking on, no backorders, qty 0
  const isOutOfStock = hasVariants
    ? !!product.trackInventory &&
      !product.allowBackorders &&
      product.variants.every((v) => v.inventoryQty === 0)
    : poolEffectiveMaxQty !== null
      ? poolEffectiveMaxQty <= 0
      : !!product.trackInventory &&
        !product.allowBackorders &&
        (product.inventoryQty ?? 0) === 0;

  // Backorder only applies to simple (non-variant, non-pooled) products
  const isBackorder =
    !hasVariants &&
    poolEffectiveMaxQty === null &&
    !!product.trackInventory &&
    !!product.allowBackorders &&
    (product.inventoryQty ?? 0) === 0;

  const disableCart = !!comingSoon || isOutOfStock || hasVariants;

  // True when variants exist and not all share the same price
  const variantPrices = product.variants.map((v) => v.price ?? product.price);
  const variablePricing = hasVariants && new Set(variantPrices).size > 1;

  const maxInventory =
    poolEffectiveMaxQty ??
    (product.trackInventory && !product.allowBackorders
      ? (product.inventoryQty ?? undefined)
      : undefined);

  // Badge priority: comingSoon > sale > outOfStock > backorder
  let badgeLabel: string | null = null;
  if (comingSoon) badgeLabel = "Coming Soon";
  else if (isOnSale) badgeLabel = "Sale";
  else if (isOutOfStock) badgeLabel = "Out of Stock";
  else if (isBackorder) badgeLabel = "Pre-order";

  const savingsLabel =
    isOnSale && displayCompareAtPrice
      ? computeSavingsLabel(displayPrice, displayCompareAtPrice)
      : null;

  return {
    isOnSale,
    isOutOfStock,
    isBackorder,
    comingSoon: !!comingSoon,
    hasVariants,
    poolEffectiveMaxQty,
    badgeLabel,
    savingsLabel,
    disableCart,
    variablePricing,
    maxInventory,
    displayPrice,
    displayCompareAtPrice,
  };
}
