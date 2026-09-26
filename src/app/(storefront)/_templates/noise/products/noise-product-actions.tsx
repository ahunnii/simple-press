"use client";

import { useState } from "react";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import { buildLucideIconsWithLabels } from "~/lib/lucide-template-icons";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { formatPrice } from "~/lib/prices";
import { useProduct } from "~/hooks/use-product";
import { NotifyMeForm } from "~/app/(storefront)/_components/product/notify-me-form";
import { SubscribePanel } from "~/app/(storefront)/_components/product/subscribe-panel";

import { nonBlank } from "../shared/noise-non-blank";
import { NoiseVariantSelector } from "./noise-variant-selector";

export type NoiseProductActionsCopy = {
  /** `noise.product.*` field values, resolved by `NoiseProductPage`. */
  comingSoonHeading: string;
  /** Blank hides the line. */
  comingSoonBody: string;
  soldOutText: string;
  /** Blank falls back to `NotifyMeForm`'s own line. */
  soldOutMessage: string;
};

type NoiseProductActionsProps = {
  product: DefaultProductPageTemplateProps["product"];
  copy: NoiseProductActionsCopy;
};

export function NoiseProductActions({
  product,
  copy,
}: NoiseProductActionsProps) {
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
    selectedVariantId,
    additionalFields,
    justAdded,
  } = useProduct(product);

  const hasVariants = Object.keys(variantOptions).length > 0;

  // `NoiseVariantSelector` keeps its own quantity stepper (separate from
  // `useProduct`'s, which stays 1 for variant products) — mirror its value
  // here so `SubscribePanel` links to `/subscribe` with what the shopper
  // actually picked instead of always `qty=1`.
  const [variantQuantity, setVariantQuantity] = useState(1);
  const subscribeQuantity = hasVariants ? variantQuantity : quantity;

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
      {additionalFields?.comingSoon ? (
        <div
          className="border px-5 py-4"
          style={{
            borderColor: "var(--vn-rule)",
            background: "var(--vn-bone)",
          }}
        >
          <p
            className="font-mono text-[10px] tracking-[0.2em] uppercase"
            {...fieldAttr("noise.product.coming-soon-heading")}
          >
            {copy.comingSoonHeading}
          </p>
          {copy.comingSoonBody ? (
            <p
              className="text-muted-foreground mt-1 font-sans text-sm"
              {...fieldAttr("noise.product.coming-soon-body")}
            >
              {copy.comingSoonBody}
            </p>
          ) : null}
        </div>
      ) : hasVariants ? (
        <NoiseVariantSelector
          product={product}
          setSelectedVariantId={setSelectedVariantId}
          onQuantityChange={setVariantQuantity}
        />
      ) : !inStock ? (
        <div className="flex flex-col gap-4">
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
            <span {...fieldAttr("noise.product.sold-out-text")}>
              {copy.soldOutText}
            </span>
          </button>
          <NotifyMeForm
            productId={product.id}
            message={nonBlank(copy.soldOutMessage)}
            messageClassName="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--vn-steel)]"
            inputClassName="rounded-none border-[var(--vn-ink)] font-sans"
            buttonClassName="rounded-none font-mono text-[11px] tracking-[0.24em] uppercase"
          />
        </div>
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
                onClick={handleAddToCart}
                className="flex flex-1 items-center justify-between px-5 py-4 font-mono text-[12px] tracking-[0.24em] uppercase transition-all"
                style={{
                  background: justAdded ? "var(--vn-steel)" : "var(--vn-ink)",
                  color: "var(--vn-bone)",
                  border: `1.5px solid ${justAdded ? "var(--vn-steel)" : "var(--vn-ink)"}`,
                }}
              >
                <span className="flex items-center gap-2">
                  {justAdded ? (
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

      {/* `noise-subscribe-panel` (globals.css) scopes the shared token-only
          panel to noise's own ink/bone palette, since noise doesn't remap
          the shadcn tokens globally. */}
      <SubscribePanel
        product={product}
        selectedVariantId={selectedVariantId}
        quantity={subscribeQuantity}
        available={inStock}
        className="noise-subscribe-panel mt-2"
        ctaClassName="inline-flex h-11 items-center justify-center gap-2 rounded-none border-[1.5px] border-[var(--vn-ink)] bg-[var(--vn-ink)] px-5 font-mono text-[11px] tracking-[0.24em] text-[var(--vn-bone)] uppercase transition-colors hover:border-[var(--vn-steel)] hover:bg-[var(--vn-steel)] focus-visible:ring-2 focus-visible:ring-[var(--vn-ink)] focus-visible:ring-offset-2 focus-visible:outline-none"
      />

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
        {justAdded ? `${product.name} added to bag` : ""}
      </div>
    </>
  );
}
