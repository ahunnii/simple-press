import type { EmailProductItem } from "~/lib/tiptap/email-products-node";
import {
  resolveVariantCompareAtPrice,
  resolveVariantPrice,
} from "~/lib/variant-price";

/**
 * The product fields a snapshot is built from: what `product.searchForPicker`
 * returns per product (the admin picker) and what `hydrateEmailProducts`
 * (`./email-products`) re-reads at send time. Both sides derive the snapshot
 * here so the composer preview and the sent email always agree. Pure and
 * React-free: imported by the editor and the server.
 */
export interface PickerProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  variants: { price: number | null; compareAtPrice: number | null }[];
  images: { url: string }[];
}

/**
 * The email snapshot of a product. With variants the price is the cheapest
 * variant's (a 0/null variant price inherits the product's), and the
 * compare-at price is that same variant's; it's kept only when it's above
 * the price.
 */
export function productToEmailItem(product: PickerProduct): EmailProductItem {
  let priceCents = product.price;
  let compareAt = product.compareAtPrice;

  if (product.variants.length > 0) {
    let best: { price: number; compareAt: number | null } | null = null;
    for (const variant of product.variants) {
      const price = resolveVariantPrice(variant.price, product.price);
      if (best === null || price < best.price) {
        best = {
          price,
          compareAt: resolveVariantCompareAtPrice(
            variant.price,
            variant.compareAtPrice,
            product.compareAtPrice,
          ),
        };
      }
    }
    if (best) {
      priceCents = best.price;
      compareAt = best.compareAt;
    }
  }

  const roundedPrice = Math.max(0, Math.round(priceCents));
  const roundedCompareAt = compareAt != null ? Math.round(compareAt) : null;

  return {
    productId: product.id,
    name: product.name,
    imageUrl: product.images[0]?.url ?? null,
    priceCents: roundedPrice,
    compareAtCents:
      roundedCompareAt !== null && roundedCompareAt > roundedPrice
        ? roundedCompareAt
        : null,
    slug: product.slug,
  };
}
