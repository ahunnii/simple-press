import type { CartItem } from "~/providers/cart-context";
import { parseCardAdditionalFields } from "~/lib/products";
import { buildVariantCartItem } from "~/lib/products/build-variant-cart-item";
import {
  isVariantPurchasable,
  pickInitialVariant,
} from "~/lib/products/initial-variant";
import { resolveVariantPrice } from "~/lib/variant-price";

/** Quantity ceiling for stock that isn't counted (mirrors use-product). */
const UNTRACKED_MAX = 100;

/**
 * One chain or charm offered in the PDP add-on picker. Resolved on the
 * server (plain JSON, safe to hand to the client picker): the product's
 * default variant is picked with the shared `pickInitialVariant` helper, and
 * `available` / `maxInventory` follow the checkout's stock rules.
 */
export type GloveAddOn = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  /** Price of the default variant (or the product) in cents. */
  unitPrice: number;
  available: boolean;
  /** Ready-made `useCart().addItem` payload (quantity added separately). */
  cartItem: Omit<CartItem, "quantity">;
};

/** Row shape selected by the product page's tenant-scoped add-on query. */
export type GloveAddOnSource = {
  id: string;
  slug: string;
  name: string;
  price: number;
  compareAtPrice: number | null;
  sku: string | null;
  trackInventory: boolean;
  allowBackorders: boolean;
  inventoryQty: number;
  baseUnitsConsumed: number | null;
  additionalFields: unknown;
  images: { url: string }[];
  variants: {
    id: string;
    name: string;
    price: number | null;
    compareAtPrice: number | null;
    inventoryQty: number;
    imageUrl: string | null;
    sku: string | null;
  }[];
  baseInventoryUnit: { inventoryQty: number; allowBackorders: boolean } | null;
};

export function toGloveAddOn(p: GloveAddOnSource): GloveAddOn {
  const comingSoon =
    parseCardAdditionalFields(p.additionalFields).comingSoon === true;
  const variant = pickInitialVariant(p.variants, p);

  if (variant) {
    const countsStock = p.trackInventory && !p.allowBackorders;
    const maxInventory = countsStock ? variant.inventoryQty : UNTRACKED_MAX;
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      imageUrl: variant.imageUrl ?? p.images[0]?.url ?? null,
      unitPrice: resolveVariantPrice(variant.price, p.price),
      available: !comingSoon && isVariantPurchasable(variant, p),
      cartItem: buildVariantCartItem(p, variant, maxInventory),
    };
  }

  const pool = p.baseInventoryUnit;
  const poolMax = pool
    ? pool.allowBackorders
      ? UNTRACKED_MAX
      : Math.floor(pool.inventoryQty / (p.baseUnitsConsumed ?? 1))
    : null;
  const maxInventory =
    poolMax ??
    (p.trackInventory && !p.allowBackorders ? p.inventoryQty : UNTRACKED_MAX);

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    imageUrl: p.images[0]?.url ?? null,
    unitPrice: p.price,
    available: !comingSoon && maxInventory > 0,
    cartItem: {
      productId: p.id,
      productSlug: p.slug,
      variantId: null,
      productName: p.name,
      variantName: null,
      price: p.price,
      compareAtPrice:
        p.compareAtPrice && p.compareAtPrice > p.price
          ? p.compareAtPrice
          : null,
      imageUrl: p.images[0]?.url ?? null,
      sku: p.sku,
      maxInventory,
    },
  };
}
