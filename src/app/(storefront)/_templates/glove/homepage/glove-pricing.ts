import type { Product } from "~/types";
import { checkProductStatus } from "~/lib/products/check-product-status";

/** What a product card needs to show a price (all in cents). */
export type GloveCardPricing = {
  price: number;
  maxPrice: number | null;
  compareAtPrice: number | null;
};

/**
 * Display price for a product, matching `GloveProductCard`: variable pricing
 * becomes a range, an on-sale product carries its compare-at price.
 */
export function gloveCardPricing(product: Product): GloveCardPricing {
  const status = checkProductStatus({
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    trackInventory: product.trackInventory,
    inventoryQty: product.inventoryQty,
    allowBackorders: product.allowBackorders,
    baseInventoryUnit: product.baseInventoryUnit
      ? { inventoryQty: product.baseInventoryUnit.inventoryQty }
      : null,
    baseUnitsConsumed: product.baseUnitsConsumed,
    additionalFields: product.additionalFields,
    variants: product.variants.map((v) => ({
      price: v.price,
      compareAtPrice: v.compareAtPrice,
      inventoryQty: v.inventoryQty,
    })),
  });

  let maxPrice: number | null = null;
  if (status.variablePricing) {
    const prices = product.variants.map((v) => v.price ?? product.price);
    const highest = Math.max(...prices);
    maxPrice = highest > status.displayPrice ? highest : null;
  }

  return {
    price: status.displayPrice,
    maxPrice,
    compareAtPrice: status.isOnSale ? status.displayCompareAtPrice : null,
  };
}
