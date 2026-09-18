"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ShoppingBag } from "lucide-react";

import type { Product } from "~/types";
import { formatPrice } from "~/lib/prices";
import { checkProductStatus } from "~/lib/products/check-product-status";
import { useCart } from "~/providers/cart-context";
import { WishlistButton } from "~/app/(storefront)/_components/wishlist/wishlist-button";

import { hasCustomImage, UmscImageFallback } from "./umsc-image-fallback";

type Props = {
  product: Product;
};

/**
 * UmscProductCard — square photo, purple New/Sale badge, Work Sans 600 name,
 * type line, gold-ink price, always-visible ghost "Add to cart" pill that
 * shows "Added" for 900ms, wishlist heart.
 */
export function UmscProductCard({ product }: Props) {
  const { addItem } = useCart();
  const [isAdded, setIsAdded] = useState(false);

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

  const image = product.images[0]?.url ?? "/placeholder.svg";
  const typeLine = product.collectionProducts?.[0]?.collection?.name ?? "";

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (status.disableCart) return;
    addItem({
      productId: product.id,
      productSlug: product.slug,
      variantId: null,
      productName: product.name,
      variantName: null,
      price: status.displayPrice,
      compareAtPrice: status.isOnSale ? status.displayCompareAtPrice : null,
      imageUrl: image,
      sku: null,
      maxInventory: status.maxInventory,
    });
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 900);
  };

  return (
    <div className="umsc-product-card group relative block">
      <div className="relative aspect-square w-full overflow-hidden bg-[var(--umsc-cream)]">
        {hasCustomImage(image) ? (
          <Image
            src={image}
            alt=""
            fill
            className="umsc-product-card-img object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <UmscImageFallback className="border-0" />
        )}

        {status.badgeLabel && (
          <span
            className={
              status.isOutOfStock
                ? "umsc-sans absolute top-3 left-3 bg-[var(--umsc-black)] px-2 py-1 text-[10px] tracking-[0.16em] text-[var(--umsc-cream-on-black)] uppercase"
                : "umsc-sans absolute top-3 left-3 bg-[var(--umsc-purple)] px-2 py-1 text-[10px] tracking-[0.16em] text-white uppercase"
            }
          >
            {status.badgeLabel}
          </span>
        )}

        <WishlistButton
          item={{
            productId: product.id,
            name: product.name,
            slug: product.slug,
            price: status.displayPrice,
            imageUrl: product.images[0]?.url ?? null,
          }}
          className="absolute top-3 right-3 z-10 rounded-full bg-[var(--umsc-white)] text-[var(--umsc-purple)] backdrop-blur-none"
        />
      </div>

      <div className="mt-4 flex flex-col gap-1">
        <h3 className="umsc-sans text-[18px] font-semibold tracking-[-0.02em] text-[var(--umsc-ink)]">
          <Link
            href={`/shop/${product.slug}`}
            className="after:absolute after:inset-0 after:content-[''] hover:opacity-80"
          >
            {product.name}
          </Link>
        </h3>
        {typeLine && (
          <span className="umsc-sans text-[13px] text-[var(--umsc-muted)]">
            {typeLine}
          </span>
        )}
        <span className="umsc-sans text-[15px] font-medium text-[var(--umsc-gold-ink)] tabular-nums">
          {status.variablePricing ? (
            <>From {formatPrice(status.displayPrice)}</>
          ) : status.isOnSale && status.displayCompareAtPrice ? (
            <>
              <span className="sr-only">Original price </span>
              <span className="mr-1.5 text-[var(--umsc-muted)] line-through">
                {formatPrice(status.displayCompareAtPrice)}
              </span>
              <span className="sr-only">Sale price </span>
              {formatPrice(status.displayPrice)}
            </>
          ) : (
            formatPrice(status.displayPrice)
          )}
        </span>
        {!status.disableCart && (
          <div className="relative z-10 mt-3">
            <button
              type="button"
              onClick={handleAddToCart}
              aria-label={`Add ${product.name} to cart`}
              className="umsc-btn umsc-btn-ghost umsc-product-card-add flex w-full items-center justify-center gap-2 bg-[var(--umsc-white)] sm:w-auto sm:self-start"
            >
              {isAdded ? (
                <>
                  <Check className="size-3.5" aria-hidden="true" />
                  Added
                </>
              ) : (
                <>
                  <ShoppingBag className="size-3.5" aria-hidden="true" />
                  Add to cart
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {isAdded ? `${product.name} added to cart` : ""}
      </div>
    </div>
  );
}
