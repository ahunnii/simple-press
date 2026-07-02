"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import type { RouterOutputs } from "~/trpc/react";
import { formatPrice } from "~/lib/prices";
import { checkProductStatus } from "~/lib/products/check-product-status";
import { useReducedMotion } from "~/hooks/use-reduced-motion";
import { useCart } from "~/providers/cart-context";
import { WishlistButton } from "~/app/(storefront)/_components/wishlist/wishlist-button";

type _HomepageProduct = NonNullable<
  RouterOutputs["business"]["getHomepage"]
>["products"][number];

// Minimal shape the card actually uses — compatible with homepage, shop, and related queries
type CardProduct = Pick<
  _HomepageProduct,
  | "id"
  | "name"
  | "slug"
  | "description"
  | "price"
  | "compareAtPrice"
  | "trackInventory"
  | "inventoryQty"
  | "allowBackorders"
  | "baseUnitsConsumed"
  | "additionalFields"
> & {
  // Structural minimums so both full rows (homepage/related) and the slimmed
  // shop-page selection remain assignable.
  images: { url: string }[];
  variants: {
    price: number | null;
    compareAtPrice: number | null;
    inventoryQty: number;
  }[];
  // baseInventoryUnit is not included in getRelated, so make it optional
  baseInventoryUnit?: { inventoryQty: number; allowBackorders: boolean } | null;
};

type Props = {
  product: CardProduct;
  index: number;
  isVisible: boolean;
  saleBadgeFormat?: string;
};

const ease = "cubic-bezier(0.22, 1, 0.36, 1)";

export function ElegantProductCard({ product, index, isVisible }: Props) {
  const { addItem } = useCart();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const reducedMotion = useReducedMotion();

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
    <article
      aria-label={product.name}
      style={
        reducedMotion
          ? { position: "relative" }
          : {
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "translateY(0)" : "translateY(24px)",
              transition: `opacity 0.7s ${ease} ${index * 80}ms, transform 0.7s ${ease} ${index * 80}ms`,
              position: "relative",
            }
      }
      className="el-product-card group"
    >
      {/* Image */}
      <div
        style={{
          position: "relative",
          aspectRatio: "4/5",
          overflow: "hidden",
          borderRadius: 8,
          background: "var(--el-cream-2, #ebe6dc)",
        }}
      >
        {/* Skeleton */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(135deg, var(--el-cream-2, #ebe6dc) 0%, var(--el-cream-3, #e0d9c8) 100%)",
            opacity: imageLoaded ? 0 : 1,
            transition: "opacity 0.5s",
          }}
        />

        <Image
          src={productImage}
          alt={product.name}
          fill
          className="object-cover"
          style={{
            opacity: imageLoaded ? 1 : 0,
            transition: `opacity 0.5s, transform 1.2s ${ease}`,
          }}
          onLoad={() => setImageLoaded(true)}
        />

        {/* Badge */}
        {productStatus.badgeLabel && (
          <span
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              padding: "4px 10px",
              background: "var(--el-paper, #fbf8f2)",
              borderRadius: 999,
              fontFamily: "var(--font-mono, ui-monospace)",
              fontSize: 9.5,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--el-ink, #1c1a17)",
              zIndex: 2,
            }}
          >
            {productStatus.badgeLabel}
          </span>
        )}

        {/* Wishlist heart — top-right (badge is top-left), above ::after overlay */}
        <WishlistButton
          item={{
            productId: product.id,
            name: product.name,
            slug: product.slug,
            price: productStatus.displayPrice,
            imageUrl: product.images[0]?.url ?? null,
          }}
          className="absolute top-3 right-3 z-[3] bg-[var(--el-paper,#fbf8f2)] text-[var(--el-ink,#1c1a17)]"
        />

        {/* Quick-add pills (slide up on hover) — z-index:3 sits above card-link ::after overlay */}
        <div
          className="el-quick-btns"
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            bottom: 12,
            display: "flex",
            gap: 8,
            zIndex: 3,
          }}
        >
          {productStatus.hasVariants ? (
            <Link
              href={`/shop/${product.slug}`}
              aria-label={`View options for ${product.name}`}
              style={{
                flex: 1,
                padding: "10px 14px",
                background: "var(--el-paper, #fbf8f2)",
                borderRadius: 999,
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-sans, sans-serif)",
                transition: `background 0.3s ${ease}, color 0.3s ${ease}`,
                textDecoration: "none",
                color: "var(--el-ink, #1c1a17)",
                textAlign: "center",
              }}
              className="el-quick-btn"
            >
              View options
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={handleAddToCart}
                aria-disabled={productStatus.disableCart || undefined}
                aria-label={`Quick add ${product.name} to bag`}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  background: "var(--el-paper, #fbf8f2)",
                  borderRadius: 999,
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                  border: "none",
                  cursor: productStatus.disableCart ? "not-allowed" : "pointer",
                  fontFamily: "var(--font-sans, sans-serif)",
                  transition: `background 0.3s ${ease}, color 0.3s ${ease}`,
                  opacity: productStatus.disableCart ? 0.5 : 1,
                }}
                className="el-quick-btn"
              >
                {isAdded ? "Added" : "Quick add"}
              </button>
              <Link
                href={`/shop/${product.slug}`}
                aria-label={`View ${product.name}`}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  background: "var(--el-paper, #fbf8f2)",
                  borderRadius: 999,
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans, sans-serif)",
                  transition: `background 0.3s ${ease}, color 0.3s ${ease}`,
                  textDecoration: "none",
                  color: "var(--el-ink, #1c1a17)",
                  textAlign: "center",
                }}
                className="el-quick-btn"
              >
                View
              </Link>
            </>
          )}
        </div>
      </div>

      {/* S-3: sr-only live region for quick-add confirmation */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {isAdded ? `Added ${product.name} to bag` : ""}
      </span>

      {/* Meta */}
      <div
        style={{
          marginTop: 14,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
        }}
      >
        <div>
          {/* Title link — ::after extends to cover the full card as click target */}
          <Link
            href={`/shop/${product.slug}`}
            className="el-card-link"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div
              style={{
                fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
                fontSize: 20,
                fontWeight: 500,
                letterSpacing: "0.005em",
                lineHeight: 1.2,
                color: "var(--el-ink, #1c1a17)",
              }}
            >
              {product.name}
            </div>
          </Link>
          {product.description && (
            <div
              style={{
                fontFamily: "var(--font-mono, ui-monospace)",
                fontSize: 10,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--el-ink-soft, #6b6659)",
                marginTop: 2,
              }}
            >
              {product.description.length > 40
                ? product.description.slice(0, 40) + "…"
                : product.description}
            </div>
          )}
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            whiteSpace: "nowrap",
            color: "var(--el-ink, #1c1a17)",
          }}
        >
          {formatPrice(productStatus.displayPrice)}
          {productStatus.isOnSale && productStatus.displayCompareAtPrice && (
            <span
              style={{
                fontSize: 12,
                color: "var(--el-ink-soft, #6b6659)",
                textDecoration: "line-through",
                marginLeft: 6,
              }}
            >
              <span className="sr-only">Original price: </span>
              {formatPrice(productStatus.displayCompareAtPrice)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
