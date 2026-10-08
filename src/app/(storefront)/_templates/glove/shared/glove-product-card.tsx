import Image from "next/image";
import Link from "next/link";

import type { Product } from "~/types";
import { checkProductStatus } from "~/lib/products/check-product-status";
import { cn } from "~/lib/utils";
import { WishlistButton } from "~/app/(storefront)/_components/wishlist/wishlist-button";

import { GlovePrice } from "./glove-price";

type GloveProductCardProps = {
  product: Product;
  /** Category names under the title (e.g. ["All Products", "Gloves"]). */
  categories?: string[];
  /** "plain" sits on white; "card" is a white tile for purple/mist bands. */
  surface?: "plain" | "card";
  /** Load the image eagerly (first row above the fold). */
  priority?: boolean;
  className?: string;
};

/**
 * Square image with a hover crossfade to the 2nd photo, wishlist heart, and
 * centered Poppins name / muted categories / primary price. Sale and sold-out
 * states show a --glove-alert badge. The title link is stretched over the
 * whole card; the heart sits above it.
 */
export function GloveProductCard({
  product,
  categories,
  surface = "plain",
  priority = false,
  className,
}: GloveProductCardProps) {
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

  const primary = product.images[0]?.url ?? "/placeholder.svg";
  const secondary = product.images[1]?.url ?? null;

  let maxPrice: number | null = null;
  if (status.variablePricing) {
    const prices = product.variants.map((v) => v.price ?? product.price);
    const highest = Math.max(...prices);
    maxPrice = highest > status.displayPrice ? highest : null;
  }

  const showBadge = status.isOnSale || status.isOutOfStock || status.comingSoon;
  const badgeLabel = status.isOutOfStock
    ? "Sold out"
    : (status.badgeLabel ?? status.savingsLabel);

  return (
    <article
      className={cn(
        "glove-product-card group relative flex h-full flex-col text-center",
        surface === "card" &&
          "rounded-[var(--glove-radius-card)] bg-[var(--glove-paper)] p-3 pb-5",
        className,
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-[var(--glove-cloud)]">
        <Image
          src={primary}
          alt=""
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 400px"
          priority={priority}
          className="object-cover"
        />
        {secondary ? (
          <Image
            src={secondary}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 400px"
            className="glove-product-img-alt object-cover"
          />
        ) : null}

        {showBadge && badgeLabel ? (
          <span className="glove-sale-badge absolute top-3 left-3 z-10">
            {badgeLabel}
          </span>
        ) : null}

        <WishlistButton
          item={{
            productId: product.id,
            name: product.name,
            slug: product.slug,
            price: status.displayPrice,
            imageUrl: product.images[0]?.url ?? null,
          }}
          className="absolute top-3 right-3 z-10 size-9 bg-[var(--glove-paper)] text-[var(--glove-primary)] shadow-[var(--glove-shadow-sm)]"
        />
      </div>

      <div className="mt-4 flex flex-1 flex-col items-center gap-1 px-1">
        <h3 className="glove-display text-[14px] leading-snug font-medium text-[var(--glove-ink)]">
          <Link
            href={`/shop/${product.slug}`}
            className="glove-product-title-link transition-colors"
          >
            {product.name}
          </Link>
        </h3>
        {categories && categories.length > 0 ? (
          <p className="text-[13px] leading-snug text-[var(--glove-muted)]">
            {categories.join(", ")}
          </p>
        ) : null}
        <GlovePrice
          className="mt-auto pt-1"
          price={status.displayPrice}
          maxPrice={maxPrice}
          compareAtPrice={status.isOnSale ? status.displayCompareAtPrice : null}
          size="sm"
        />
      </div>
    </article>
  );
}
