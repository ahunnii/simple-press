"use client";

import Image from "next/image";
import Link from "next/link";
import { Clock, Eye, PackageX, Tag, Timer } from "lucide-react";

import type { Product } from "~/types";
import { formatPrice } from "~/lib/prices";
import {
  checkProductStatus,
  type ProductStatus,
} from "~/lib/products/check-product-status";
import { Badge } from "~/components/ui/badge";
import { WishlistButton } from "~/app/(storefront)/_components/wishlist/wishlist-button";

type Props = {
  product: Product;
  index: number;
};

const wishlistClassName =
  "bg-[var(--bam-cream)]/90 text-[var(--bam-forest)] hover:bg-[var(--bam-cream)] hover:text-[var(--bam-forest-deep)]";

/**
 * Ambient-glow status badge — one badge, chosen by the same priority order
 * `checkProductStatus` already encodes in `badgeLabel` (comingSoon > sale >
 * outOfStock > backorder). The label text is read straight from
 * `badgeLabel` so the copy never drifts from the shared status logic; only
 * the color/icon per condition are template-specific.
 */
function StatusBadge({
  status,
  position = "absolute top-2 left-2",
}: {
  status: ProductStatus;
  /** Positioning classes — the caller decides whose relative box it anchors to. */
  position?: string;
}) {
  if (!status.badgeLabel) return null;

  if (status.comingSoon) {
    return (
      <Badge
        className={`${position} gap-1 bg-amber-700 text-white hover:bg-amber-700`}
      >
        <Clock className="size-3" aria-hidden="true" />
        {status.badgeLabel}
      </Badge>
    );
  }
  if (status.isOnSale) {
    return (
      <Badge
        className={`${position} gap-1 bg-[var(--bam-forest)] text-[var(--bam-cream)] hover:bg-[var(--bam-forest)]`}
      >
        <Tag className="size-3" aria-hidden="true" />
        {status.badgeLabel}
      </Badge>
    );
  }
  if (status.isOutOfStock) {
    return (
      <Badge
        className={`${position} gap-1 bg-foreground/70 text-background hover:bg-foreground/70`}
      >
        <PackageX className="size-3" aria-hidden="true" />
        {status.badgeLabel}
      </Badge>
    );
  }
  if (status.isBackorder) {
    return (
      <Badge
        className={`${position} gap-1 bg-blue-600 text-white hover:bg-blue-600`}
      >
        <Timer className="size-3" aria-hidden="true" />
        {status.badgeLabel}
      </Badge>
    );
  }
  return null;
}

/**
 * Ambient-glow image — a blurred, oversized copy of the product photo fills
 * the frame behind an `object-contain` foreground, so empty letterbox space
 * around non-square photos reads as a soft glow instead of a flat fill.
 * Ported from happy-bamboo's product card (see that file's comment for the
 * scale-150/blur-2xl math) and retinted for bamboo's cream surfaces — the
 * frame itself sits on `--bam-cream-deep` so the glow always has a warm
 * backdrop to bloom against, even before the images finish loading.
 */
function AmbientGlowImage({
  src,
  alt,
  foregroundSizes,
  backdropSizes = "128px",
}: {
  src: string;
  alt: string;
  foregroundSizes: string;
  backdropSizes?: string;
}) {
  return (
    <>
      <Image
        src={src}
        alt=""
        aria-hidden="true"
        fill
        sizes={backdropSizes}
        className="scale-150 object-cover opacity-90 blur-2xl saturate-125"
      />
      <Image
        src={src}
        alt={alt}
        fill
        sizes={foregroundSizes}
        className="object-contain transition-transform duration-500 ease-out group-hover:scale-[1.03]"
      />
    </>
  );
}

export function BambooProductCard({ product }: Props) {
  const productStatus = checkProductStatus({
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

  const productImage = product.images[0]?.url ?? "/placeholder.svg";
  const productHref = `/shop/${product.slug}`;

  return (
    // happy-bamboo's card arrangement: horizontal on sm+ (image rail left,
    // content right). The image rail holds its own Link so the wishlist
    // button can sit as a sibling of it (never a <button> inside an <a>);
    // the title and CTA get their own separate Links too, matching
    // happy-bamboo's actual anchor structure (no single card-wide link).
    <div className="group bg-card flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--bam-hairline)] transition-all duration-300 hover:border-[var(--bam-gold)]/30 hover:shadow-md sm:flex-row sm:items-stretch">
      <div className="relative aspect-5/3 w-full flex-none shrink-0 overflow-hidden rounded-t-2xl bg-[var(--bam-cream-deep)] sm:aspect-auto sm:min-h-[160px] sm:w-44 sm:rounded-t-none sm:rounded-l-2xl md:w-52">
        <Link
          href={productHref}
          className="absolute inset-0 block"
          aria-label={`View ${product.name}`}
          tabIndex={-1}
        >
          <AmbientGlowImage
            src={productImage}
            alt={product.name ?? "Product Image"}
            foregroundSizes="(max-width: 640px) 100vw, 208px"
          />
          <StatusBadge status={productStatus} />
        </Link>
        <WishlistButton
          item={{
            productId: product.id,
            name: product.name,
            slug: product.slug,
            price: productStatus.displayPrice,
            imageUrl: product.images[0]?.url ?? null,
          }}
          className={`absolute top-2 right-2 z-10 ${wishlistClassName}`}
        />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-between gap-3 px-5 py-5 sm:py-6">
        <div className="min-w-0 space-y-1">
          <Link
            href={productHref}
            className="focus-visible:ring-ring block rounded-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <h3 className="text-card-foreground font-heading line-clamp-2 text-lg leading-snug font-semibold transition-colors group-hover:text-[var(--bam-forest-deep)]">
              {product.name}
            </h3>
          </Link>
          {product.description && (
            <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-foreground items-center text-xl font-bold">
              {formatPrice(productStatus.displayPrice)}{" "}
              {productStatus.variablePricing && (
                <span className="text-muted-foreground text-sm">+</span>
              )}
            </span>
            {productStatus.isOnSale &&
              productStatus.displayCompareAtPrice && (
                <span className="text-muted-foreground text-sm line-through">
                  <span className="sr-only">Original price: </span>
                  {formatPrice(productStatus.displayCompareAtPrice)}
                </span>
              )}
          </div>
          <Link
            href={productHref}
            className="focus-visible:ring-ring inline-flex items-center gap-2 rounded-full bg-[var(--bam-forest)] px-3 py-1.5 text-sm font-medium text-[var(--bam-cream)] transition-colors hover:bg-[var(--bam-forest-deep)] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <Eye className="size-4" aria-hidden="true" />
            View Product
          </Link>
        </div>
      </div>
    </div>
  );
}

export function BambooHorizontalProductCard({ product }: Props) {
  const productStatus = checkProductStatus({
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

  const productImage = product.images[0]?.url ?? "/placeholder.svg";
  return (
    <Link
      href={`/shop/${product.slug}`}
      className="group bg-card relative flex gap-4 rounded-2xl border border-[var(--bam-hairline)] p-4 transition-all duration-300 hover:border-[var(--bam-gold)]/30 hover:shadow-md"
    >
      <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-[var(--bam-cream-deep)]">
        <AmbientGlowImage
          src={productImage}
          alt={product.name ?? "Product Image"}
          foregroundSizes="96px"
          backdropSizes="96px"
        />
      </div>
      <div className="flex flex-col gap-1">
        <div className="relative">
          <h3 className="text-card-foreground font-heading text-base font-semibold transition-colors group-hover:text-[var(--bam-forest-deep)]">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-muted-foreground line-clamp-1 text-sm">
              {product.description.length > 50
                ? `${product.description.slice(0, 50)}...`
                : product.description}
            </p>
          )}
        </div>

        <div className="mt-auto flex items-baseline gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-foreground items-center text-xl font-bold">
              {formatPrice(productStatus.displayPrice)}{" "}
              {productStatus.variablePricing && (
                <span className="text-muted-foreground text-sm">+</span>
              )}
            </span>
            {productStatus.isOnSale && productStatus.displayCompareAtPrice && (
              <span className="text-muted-foreground text-sm line-through">
                <span className="sr-only">Original price: </span>
                {formatPrice(productStatus.displayCompareAtPrice)}
              </span>
            )}
          </div>
        </div>
      </div>

      <StatusBadge status={productStatus} position="absolute top-3 right-3" />
    </Link>
  );
}
