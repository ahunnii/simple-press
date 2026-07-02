"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import type { Product } from "~/types";
import { formatPrice } from "~/lib/prices";
import { parseCardAdditionalFields } from "~/lib/products";
import { checkProductStatus } from "~/lib/products/check-product-status";
import { useCart } from "~/providers/cart-context";
import { WishlistButton } from "~/app/(storefront)/_components/wishlist/wishlist-button";

type Props = {
  product: Product;
  index: number;
};

export function NoiseProductCard({ product, index }: Props) {
  const { addItem } = useCart();
  const [isAdded, setIsAdded] = useState(false);

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
  const additional = parseCardAdditionalFields(product.additionalFields);

  /* Corner stamp label — combine edition + status if flagged */
  const isNew = productStatus.badgeLabel?.toLowerCase() === "new";
  const isSoldOut = productStatus.isOutOfStock;
  const editionBase = `N° ${String(index + 1).padStart(2, "0")}`;
  const editionLabel = isNew
    ? `${editionBase} · NEW`
    : isSoldOut
      ? `${editionBase} · SOLD`
      : editionBase;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (productStatus.disableCart) return;
    addItem({
      productId: product.id,
      productSlug: product.slug,
      variantId: null,
      productName: product.name,
      variantName: null,
      price: productStatus.displayPrice,
      compareAtPrice: productStatus.isOnSale
        ? productStatus.displayCompareAtPrice
        : null,
      imageUrl: productImage,
      sku: null,
      maxInventory: productStatus.maxInventory,
    });
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <div className="vn-prod-link group relative block">
      {/* Image — 4:5 aspect ratio matching design */}
      <div
        className="vn-prod-pic border-foreground relative w-full overflow-hidden border"
        style={{ aspectRatio: "4 / 5", background: "var(--vn-steel)" }}
      >
        {productImage !== "/placeholder.svg" ? (
          <Image
            src={productImage}
            alt=""
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          /* Placeholder panel matching design's striped steel */
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              background:
                "repeating-linear-gradient(135deg, rgba(255,255,255,.06) 0 12px, transparent 12px 24px), linear-gradient(180deg, var(--vn-steel-deep), var(--vn-steel))",
            }}
          >
            <span
              className="font-serif italic select-none"
              style={{
                fontSize: "64px",
                color: "var(--vn-bone)",
                opacity: 0.4,
              }}
            >
              {String(index + 1)}
            </span>
          </div>
        )}

        {/* Top-left: edition stamp (+ status suffix if sold/new) */}
        {productStatus?.badgeLabel && (
          <div
            className="absolute top-2.5 left-2.5 px-1.5 py-1 font-mono text-[10px] tracking-[0.18em] whitespace-nowrap uppercase"
            style={
              isNew
                ? {
                    background: "var(--vn-paper)",
                    color: "var(--vn-ink)",
                    border: "1px solid var(--vn-ink)",
                  }
                : isSoldOut
                  ? {
                      background: "var(--vn-steel)",
                      color: "var(--vn-bone)",
                    }
                  : {
                      background: "var(--vn-bone)",
                      color: "var(--vn-ink)",
                    }
            }
          >
            {productStatus?.badgeLabel}
          </div>
        )}

        {/* Wishlist heart — top-right (edition stamp is top-left); sharp
            corners + bone/ink palette; z-10 stays above the card-link ::after */}
        <WishlistButton
          item={{
            productId: product.id,
            name: product.name,
            slug: product.slug,
            price: productStatus.displayPrice,
            imageUrl: product.images[0]?.url ?? null,
          }}
          className="absolute top-2.5 right-2.5 z-10 rounded-none bg-[var(--vn-bone)] text-[var(--vn-ink)]"
        />

        {/* Add-to-cart bar — slides up on hover. z-10 keeps it above the
            stretched card link (::after) so it stays independently clickable. */}
        {!productStatus.disableCart && (
          <div className="absolute inset-x-0 bottom-0 z-10 translate-y-full transition-transform duration-300 group-focus-within:translate-y-0 group-hover:translate-y-0">
            <button
              type="button"
              onClick={handleAddToCart}
              aria-label={`Add ${product.name} to bag`}
              className="flex w-full items-center justify-center gap-2 py-3 font-mono text-[10px] tracking-[0.25em] uppercase transition-opacity hover:opacity-80"
              style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Add to bag
            </button>
          </div>
        )}
      </div>

      {/* Meta — grid: name (1fr) + price (auto), sub row spans both */}
      <div
        className="mt-3"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto",
          gap: "4px 12px",
          alignItems: "baseline",
        }}
      >
        {/* Product name — stretched link covers the whole card via ::after */}
        <h3
          className="min-w-0 truncate font-serif leading-[1.1] italic transition-opacity group-hover:opacity-60"
          style={{ fontSize: "22px", letterSpacing: "-0.005em" }}
        >
          <Link href={`/shop/${product.slug}`} className="vn-card-link">
            {product.name}
          </Link>
        </h3>

        {/* Price */}
        <span
          className="font-mono whitespace-nowrap"
          style={{ fontSize: "13px", letterSpacing: "0.06em" }}
        >
          {productStatus.isOnSale && productStatus.displayCompareAtPrice ? (
            <span
              className="mr-1.5 line-through"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              {formatPrice(productStatus.displayCompareAtPrice)}
            </span>
          ) : null}
          {formatPrice(productStatus.displayPrice)}
          {productStatus.variablePricing && "+"}
        </span>

        {/* Sub row — tagline left, swatches right */}
        <div
          className="col-span-2 flex min-w-0 items-center justify-between gap-3.5"
          style={{ marginTop: "2px" }}
        >
          <span
            className="min-w-0 truncate font-mono text-[10.5px] tracking-[0.16em] uppercase"
            style={{ color: "var(--vn-steel)" }}
          >
            {additional?.productTagline ??
              (product.sku ? `SKU · ${product.sku}` : " ")}
          </span>
        </div>
      </div>
      {/* S-2: live region for add-to-cart announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {isAdded ? `${product.name} added to bag` : ""}
      </div>
    </div>
  );
}
