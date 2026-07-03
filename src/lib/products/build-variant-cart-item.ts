import {
  resolveVariantCompareAtPrice,
  resolveVariantPrice,
} from "~/lib/variant-price";

export type CartItemProductInput = {
  id: string;
  slug: string;
  name: string;
  price: number;
  compareAtPrice: number | null;
  images: { url: string }[];
};

export type CartItemVariantInput = {
  id: string;
  name: string;
  price: number | null;
  compareAtPrice: number | null;
  imageUrl: string | null;
  sku: string | null;
};

/**
 * Builds the payload for `useCart().addItem` from a product + selected
 * variant, correctly handling:
 * - productSlug (so cart line items link to the right PDP instead of 404ing)
 * - compareAtPrice (so sale strikethrough survives into the cart)
 * - variant price of 0/null meaning "inherit the product's base price"
 *   (see ~/lib/variant-price.ts)
 */
export function buildVariantCartItem(
  product: CartItemProductInput,
  variant: CartItemVariantInput,
  maxInventory: number,
) {
  const price = resolveVariantPrice(variant.price, product.price);
  const compareAtPrice = resolveVariantCompareAtPrice(
    variant.price,
    variant.compareAtPrice,
    product.compareAtPrice,
  );

  return {
    productId: product.id,
    productSlug: product.slug,
    variantId: variant.id,
    productName: product.name,
    variantName: variant.name,
    price,
    compareAtPrice:
      compareAtPrice && compareAtPrice > price ? compareAtPrice : null,
    imageUrl: variant.imageUrl ?? product.images[0]?.url ?? null,
    sku: variant.sku,
    maxInventory,
  };
}
