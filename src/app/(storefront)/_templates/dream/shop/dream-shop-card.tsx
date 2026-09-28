import Link from "next/link";

import type { Product } from "~/types";
import { computeSavingsLabel, formatPrice } from "~/lib/prices";
import { checkProductStatus } from "~/lib/products/check-product-status";
import { WishlistButton } from "~/app/(storefront)/_components/wishlist/wishlist-button";

import { DreamPhoto } from "../shared/dream-photo";

type Props = {
  product: Product;
  /** Eager-load the photo (first row of a grid). */
  priority?: boolean;
};

/**
 * Grid product tile for dream's shop (and, later, collection) grids. Same
 * look as the PDP's `DreamRelatedCard` — 4:5 hairline photo frame with the
 * designed sky fallback, Italiana name, quiet tabular price — plus what a
 * catalogue tile needs that a related tile doesn't: a sale / sold-out chip
 * and the wishlist toggle (itself gated on the `wishlist` flag).
 *
 * The wishlist button is a sibling of the card link (never a `<button>`
 * inside an `<a>`), absolutely placed over the photo's top-right corner.
 * Server-safe (no hooks of its own) so it renders inside server or client
 * grids alike.
 */
export function DreamShopCard({ product, priority }: Props) {
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

  const image = product.images[0];
  const alt = image?.altText?.trim() ? image.altText : product.name;
  const onSale = status.isOnSale && !!status.displayCompareAtPrice;
  const chip = status.isOutOfStock
    ? "Sold out"
    : onSale && status.displayCompareAtPrice
      ? computeSavingsLabel(status.displayPrice, status.displayCompareAtPrice)
      : null;

  return (
    <div className="relative">
      <Link
        href={`/shop/${product.slug}`}
        className="group flex flex-col gap-3 rounded-[var(--dream-radius-photo)] no-underline"
      >
        <div className="relative">
          <DreamPhoto
            src={image?.url ?? ""}
            alt={alt ?? product.name}
            aspect="4 / 5"
            fallbackTone="sky"
            priority={priority}
          />
          {chip ? (
            <span
              className={
                status.isOutOfStock
                  ? "absolute top-3 left-3 inline-flex items-center rounded-[var(--dream-radius-pill)] border border-[var(--dream-line)] bg-[var(--dream-paper)] px-3 py-1 text-[13px] font-semibold text-[var(--dream-ink)]"
                  : "absolute top-3 left-3 inline-flex items-center rounded-[var(--dream-radius-pill)] bg-[var(--dream-gold-soft)] px-3 py-1 text-[13px] font-semibold text-[var(--dream-ink)]"
              }
            >
              {chip}
            </span>
          ) : null}
        </div>
        <span className="flex flex-col gap-1 px-1">
          <span className="[font-family:var(--font-dream-display)] text-[19px] leading-[1.2] text-[var(--dream-ink)] decoration-[var(--dream-rose)] underline-offset-4 group-hover:underline sm:text-[22px]">
            {product.name}
          </span>
          <span className="flex flex-wrap items-baseline gap-x-2 text-[15px] text-[var(--dream-soft)] tabular-nums">
            <span>
              {formatPrice(status.displayPrice)}
              {status.variablePricing ? (
                <>
                  <span aria-hidden="true">+</span>
                  <span className="sr-only"> and up</span>
                </>
              ) : null}
            </span>
            {onSale && status.displayCompareAtPrice ? (
              <span className="text-[14px] line-through opacity-80">
                <span className="sr-only">Original price: </span>
                {formatPrice(status.displayCompareAtPrice)}
              </span>
            ) : null}
          </span>
        </span>
      </Link>
      <WishlistButton
        item={{
          productId: product.id,
          name: product.name,
          slug: product.slug,
          price: status.displayPrice,
          imageUrl: image?.url ?? null,
        }}
        className="absolute top-3 right-3 z-10 size-9 rounded-full border border-[var(--dream-line)] bg-[var(--dream-paper)] text-[var(--dream-ink)] shadow-none backdrop-blur-none"
      />
    </div>
  );
}
