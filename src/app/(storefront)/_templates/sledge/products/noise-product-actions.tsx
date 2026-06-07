"use client";

import { useState } from "react";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import { cn } from "~/lib/utils";
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
      <div className="flex items-baseline justify-between border-t border-[var(--sl-ink)] pt-5">
        <div className="font-serif text-[clamp(2.4rem,4vw,3rem)] leading-none tracking-[-0.01em] italic">
          {priceMajor}
          <span className="ml-0.5 text-[0.45em] text-[var(--sl-green)]">
            .{priceMinor}
          </span>
          {isOnSale && displayCompareAtPrice && (
            <span className="ml-3 font-sans text-[1.2rem] font-normal text-[var(--sl-ink-soft)] line-through">
              {formatPrice(displayCompareAtPrice)}
            </span>
          )}
        </div>
        {product.sku && (
          <div className="text-right font-mono text-[11px] tracking-[0.16em] text-[var(--sl-green)] uppercase">
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
        <div className="border border-[var(--vn-rule)] bg-[var(--sl-cream)] px-5 py-4">
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase">
            Coming Soon
          </p>
          <p className="text-muted-foreground mt-1 font-sans text-sm">
            This piece isn&apos;t available yet. Check back soon.
          </p>
        </div>
      ) : !inStock ? (
        <button
          disabled
          className="w-full cursor-not-allowed border-[1.5px] border-[var(--sl-ink)] bg-[var(--sl-ink)] py-4 font-mono text-[11px] tracking-[0.24em] text-[var(--sl-cream)] uppercase opacity-40"
        >
          Sold Out
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          {canAddMore && (
            <div className="flex items-stretch gap-3">
              {/* Qty stepper */}
              <div className="flex items-center border-[1.5px] border-[var(--sl-ink)]">
                <button
                  className="hover:bg-foreground hover:text-background flex h-full min-h-[52px] w-11 items-center justify-center font-mono transition-colors"
                  onClick={handleDecrement}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="w-[42px] text-center font-mono text-sm font-medium">
                  {quantity}
                </span>
                <button
                  className="hover:bg-foreground hover:text-background flex h-full min-h-[52px] w-11 items-center justify-center font-mono transition-colors"
                  onClick={handleIncrement}
                  aria-label="Increase quantity"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>

              {/* Add to bag */}
              <button
                onClick={addToCart}
                className={cn(
                  "flex flex-1 items-center justify-between border-[1.5px] px-5 py-4 font-mono text-[12px] tracking-[0.24em] text-[var(--sl-cream)] uppercase transition-all",
                  isAdded
                    ? "border-[var(--sl-green)] bg-[var(--sl-green)]"
                    : "border-[var(--sl-ink)] bg-[var(--sl-ink)]",
                )}
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
              <badge.Icon className="size-3.5 text-[var(--sl-green)]" />
              {badge.label}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
