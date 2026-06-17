"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import type { Product } from "~/types";
import { formatPrice } from "~/lib/prices";
import { checkProductStatus } from "~/lib/products/check-product-status";
import { useCart } from "~/providers/cart-context";

type Props = {
  product: Product;
  index: number;
};

export function ViiProductCard({ product, index }: Props) {
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
    <div className="group relative block">
      {/* Image — square, product centered on a clean light field */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          aspectRatio: "1 / 1",
          background: "var(--vii-paper)",
        }}
      >
        {productImage !== "/placeholder.svg" ? (
          <Image
            src={productImage}
            alt=""
            fill
            className="object-contain p-[8%] transition-opacity duration-500 group-hover:opacity-90"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: "var(--vii-cream)" }}
          >
            <span
              className="select-none"
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: "44px",
                color: "var(--vii-tan)",
              }}
            >
              {index + 1}
            </span>
          </div>
        )}

        {/* Status badge — only when sold out or on sale */}
        {productStatus?.badgeLabel && (
          <div
            className="absolute top-3 left-3 px-2 py-1 text-[10px] tracking-[0.16em] uppercase"
            style={{
              fontFamily: "var(--font-sans)",
              background: productStatus.isOutOfStock
                ? "var(--vii-navy)"
                : "var(--vii-paper)",
              color: productStatus.isOutOfStock
                ? "var(--vii-paper)"
                : "var(--vii-navy)",
            }}
          >
            {productStatus.badgeLabel}
          </div>
        )}

        {/* Add-to-cart bar — slides up on hover/focus, hidden at rest */}
        {!productStatus.disableCart && (
          <div className="absolute inset-x-0 bottom-0 z-10 translate-y-full transition-transform duration-300 group-focus-within:translate-y-0 group-hover:translate-y-0">
            <button
              type="button"
              onClick={handleAddToCart}
              aria-label={`Add ${product.name} to bag`}
              className="flex w-full items-center justify-center gap-2 py-3 text-[10px] tracking-[0.22em] uppercase transition-opacity hover:opacity-90"
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 500,
                background: "var(--vii-copper)",
                color: "var(--vii-paper)",
              }}
            >
              <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
              Add to bag
            </button>
          </div>
        )}
      </div>

      {/* Meta — name + price only */}
      <div className="mt-4 flex flex-col gap-1.5">
        <h3
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "18px",
            fontWeight: 500,
            lineHeight: 1.2,
            color: "var(--vii-navy)",
          }}
        >
          <Link
            href={`/shop/${product.slug}`}
            className="transition-opacity hover:opacity-70 focus-visible:opacity-70"
          >
            {product.name}
          </Link>
        </h3>

        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "14px",
            letterSpacing: "0.02em",
            color: "var(--vii-ink-soft)",
          }}
        >
          {productStatus.variablePricing ? (
            <>From {formatPrice(productStatus.displayPrice)}</>
          ) : productStatus.isOnSale && productStatus.displayCompareAtPrice ? (
            <>
              <span className="mr-1.5 line-through">
                {formatPrice(productStatus.displayCompareAtPrice)}
              </span>
              {formatPrice(productStatus.displayPrice)}
            </>
          ) : (
            formatPrice(productStatus.displayPrice)
          )}
        </span>
      </div>

      {/* Live region for add-to-cart announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {isAdded ? `${product.name} added to bag` : ""}
      </div>
    </div>
  );
}
