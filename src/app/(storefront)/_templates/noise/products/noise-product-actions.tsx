"use client";

import { useState } from "react";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import { buildLucideIconsWithLabels } from "~/lib/lucide-template-icons";
import { formatPrice } from "~/lib/prices";
import { useProduct } from "~/hooks/use-product";

import { NoiseVariantSelector } from "./noise-variant-selector";

export function NoiseProductActions({
  product,
}: DefaultProductPageTemplateProps) {
  const {
    inStock,
    variantOptions,
    displayPrice,
    displayCompareAtPrice,
    isOnSale,
    handleAddToCart,
    canAddMore,
    handleDecrement,
    handleIncrement,
    quantity,
    setSelectedVariantId,
    additionalFields,
  } = useProduct(product);

  const [isAdded, setIsAdded] = useState(false);

  const addToCart = () => {
    handleAddToCart();
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  /* Price split: major / minor for styled display */
  const priceStr = formatPrice(displayPrice);
  const dotIdx = priceStr.indexOf(".");
  const priceMajor = dotIdx >= 0 ? priceStr.slice(0, dotIdx) : priceStr;
  const priceMinor = dotIdx >= 0 ? priceStr.slice(dotIdx + 1) : "00";

  const trustBadges = buildLucideIconsWithLabels(additionalFields);

  return (
    <>
      {/* Price row — lives here so it reacts to variant changes */}
      <div
        className="flex items-baseline justify-between border-t pt-5"
        style={{ borderColor: "var(--vn-ink)" }}
      >
        <div
          className="font-serif leading-none italic"
          style={{
            fontSize: "clamp(2.4rem, 4vw, 3rem)",
            letterSpacing: "-0.01em",
          }}
        >
          {priceMajor}
          <span
            style={{
              fontSize: "0.45em",
              color: "var(--vn-steel)",
              marginLeft: "2px",
            }}
          >
            .{priceMinor}
          </span>
          {isOnSale && displayCompareAtPrice && (
            <span
              className="ml-3 font-sans font-normal line-through"
              style={{ fontSize: "1.2rem", color: "var(--vn-steel-mist)" }}
            >
              {formatPrice(displayCompareAtPrice)}
            </span>
          )}
        </div>
        {product.sku && (
          <div
            className="text-right font-mono text-[11px] tracking-[0.16em] uppercase"
            style={{ color: "var(--vn-steel)" }}
          >
            SKU · {product.sku}
          </div>
        )}
      </div>

      {/* Variant selectors */}
      {Object.keys(variantOptions).length > 0 ? (
        <NoiseVariantSelector
          product={product}
          setSelectedVariantId={setSelectedVariantId}
        />
      ) : additionalFields?.comingSoon ? (
        <div
          className="border px-5 py-4"
          style={{
            borderColor: "var(--vn-rule)",
            background: "var(--vn-bone)",
          }}
        >
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase">
            Coming Soon
          </p>
          <p className="text-muted-foreground mt-1 font-sans text-sm">
            This piece isn&apos;t available yet. Check back soon.
          </p>
        </div>
      ) : !inStock ? (
        <button
          aria-disabled="true"
          onClick={(e) => e.preventDefault()}
          className="w-full cursor-not-allowed py-4 font-mono text-[11px] tracking-[0.24em] uppercase opacity-40"
          style={{
            background: "var(--vn-ink)",
            color: "var(--vn-bone)",
            border: "1.5px solid var(--vn-ink)",
          }}
        >
          Sold Out
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          {canAddMore && (
            <div className="flex items-stretch gap-3">
              {/* Qty stepper */}
              <div
                className="flex items-center"
                style={{ border: "1.5px solid var(--vn-ink)" }}
              >
                <button
                  className="hover:bg-foreground hover:text-background flex items-center justify-center font-mono transition-colors"
                  style={{ width: "44px", height: "100%", minHeight: "52px" }}
                  onClick={handleDecrement}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                >
                  <Minus className="size-3.5" />
                </button>
                <span
                  className="text-center font-mono text-sm font-medium"
                  style={{ width: "42px" }}
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {quantity}
                </span>
                <button
                  className="hover:bg-foreground hover:text-background flex items-center justify-center font-mono transition-colors"
                  style={{ width: "44px", height: "100%", minHeight: "52px" }}
                  onClick={handleIncrement}
                  aria-label="Increase quantity"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>

              {/* Add to bag */}
              <button
                onClick={addToCart}
                className="flex flex-1 items-center justify-between px-5 py-4 font-mono text-[12px] tracking-[0.24em] uppercase transition-all"
                style={{
                  background: isAdded ? "var(--vn-steel)" : "var(--vn-ink)",
                  color: "var(--vn-bone)",
                  border: `1.5px solid ${isAdded ? "var(--vn-steel)" : "var(--vn-ink)"}`,
                }}
              >
                <span className="flex items-center gap-2">
                  {isAdded ? (
                    <>
                      <Check className="size-3.5" />
                      Added to bag
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="size-4" />
                      Add to bag
                    </>
                  )}
                </span>
                <span>{formatPrice(displayPrice)} →</span>
              </button>
            </div>
          )}

          {!canAddMore && inStock && (
            <p className="font-mono text-[10px] tracking-[0.2em] text-amber-600 uppercase">
              Maximum available quantity in cart
            </p>
          )}
          {product.trackInventory &&
            product.allowBackorders &&
            (product.inventoryQty ?? 0) === 0 && (
              <p className="text-muted-foreground font-mono text-[10px] tracking-[0.2em] uppercase">
                Backordered — ships when available
              </p>
            )}
        </div>
      )}

      {/* Trust badges from additionalFields */}
      {trustBadges?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {trustBadges.map((badge, i) => (
            <div key={`${badge.label}-${i}`} className="vn-stamp text-[9.5px]">
              <badge.Icon
                className="size-3.5"
                style={{ color: "var(--vn-steel)" }}
              />
              {badge.label}
            </div>
          ))}
        </div>
      )}

      {/* S-2: live region for add-to-cart announcements (no-variant path) */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {isAdded ? `${product.name} added to bag` : ""}
      </div>
    </>
  );
}
