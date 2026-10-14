"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check, Minus, Plus } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { parseCardAdditionalFields } from "~/lib/products";
import { useProduct } from "~/hooks/use-product";
import { applyCustomizerToCartItem } from "~/components/customizer/apply-to-cart-item";
import { ProductCustomizer } from "~/components/customizer/product-customizer";
import { useProductCustomizer } from "~/components/customizer/use-product-customizer";
import { NotifyMeForm } from "~/app/(storefront)/_components/product/notify-me-form";
import { SubscribePanel } from "~/app/(storefront)/_components/product/subscribe-panel";

import { ElegantVariantSelector } from "./elegant-variant-selector";

const ease = "cubic-bezier(0.22, 1, 0.36, 1)";

type Props = DefaultProductPageTemplateProps & {
  /** `elegant.product.coming-soon-heading` — resolved by the product page. */
  comingSoonHeading: string;
  /** `elegant.product.coming-soon-body` — blank hides the line. */
  comingSoonBody: string;
  /**
   * Notified with the live configured price (selected variant + chosen
   * options) while the product has a customizer, `null` otherwise, so the
   * page can show it in place of the base price.
   */
  onConfiguredPriceChange?: (
    price: { price: number; compareAtPrice: number | null } | null,
  ) => void;
};

// Product options, dressed like the variant chips: mono small-caps labels,
// paper tiles with a hairline, an ink ring on the selected one. Colors come
// from the template's `--el-*` tokens (with `color:` hints so they never read
// as a font size); the focus outline matches `.el-variant-btn:focus-visible`.
const ELEGANT_CUSTOMIZER_CLASSNAMES = {
  legend:
    "font-mono text-[11px] font-normal tracking-[0.14em] text-[color:var(--el-ink-soft)] uppercase",
  help: "font-sans text-[13px] text-[color:var(--el-ink-soft)]",
  count:
    "font-mono text-[11px] tracking-[0.1em] text-[color:var(--el-ink-soft)]",
  value:
    "rounded-[14px] border-[color:var(--el-line)] bg-[color:var(--el-paper)] text-[color:var(--el-ink)] hover:bg-[color:var(--el-cream)] data-[selected=true]:border-[color:var(--el-ink)] data-[selected=true]:ring-1 data-[selected=true]:ring-[color:var(--el-ink)] has-[:focus-visible]:outline-[color:var(--el-sage)]",
  valueImage: "rounded-[10px]",
  valueLabel: "font-sans text-[13px]",
  valuePrice:
    "font-mono text-[10.5px] tracking-[0.1em] text-[color:var(--el-ink-soft)] uppercase",
  clear:
    "font-mono text-[11px] tracking-[0.1em] text-[color:var(--el-ink-soft)] uppercase hover:text-[color:var(--el-ink)]",
  limit: "font-sans text-[12px] text-[color:var(--el-ink-soft)]",
  textInput:
    "rounded-full border-[color:var(--el-line)] bg-[color:var(--el-paper)] px-4 font-sans text-[color:var(--el-ink)] focus-visible:border-[color:var(--el-sage)] focus-visible:ring-[color:var(--el-sage)]/30",
  textCounter:
    "font-mono text-[11px] tracking-[0.1em] text-[color:var(--el-ink-soft)]",
  error: "font-sans text-[13px]",
};

const ELEGANT_TRAY_CLASSNAMES = {
  item: "border-[color:var(--el-line)] bg-[color:var(--el-paper)] font-sans text-[color:var(--el-ink)]",
};

export function ElegantProductActions({
  product,
  comingSoonHeading,
  comingSoonBody,
  onConfiguredPriceChange,
}: Props) {
  const {
    inStock,
    variantOptions,
    handleAddToCart,
    handleAddToCartWith,
    displayCompareAtPrice,
    remainingStock,
    canAddMore,
    handleDecrement,
    handleIncrement,
    quantity,
    selectedVariantId,
    setSelectedVariantId,
    formatPrice,
    displayPrice,
    justAdded,
    cartEnabled,
  } = useProduct(product);

  const additional = parseCardAdditionalFields(product.additionalFields);
  const hasVariants = Object.keys(variantOptions).length > 0;

  // `ElegantVariantSelector` keeps its own quantity stepper (separate from
  // `useProduct`'s, which stays 1 for variant products) — mirror its value
  // here so `SubscribePanel` links to `/subscribe` with what the shopper
  // actually picked instead of always `qty=1`.
  const [variantQuantity, setVariantQuantity] = useState(1);
  const subscribeQuantity = hasVariants ? variantQuantity : quantity;

  // Product options (customizer): null when the feature is off or the
  // product has no groups, and then nothing below changes. `displayPrice`
  // follows the selected variant. Catalog mode (`cart` off) has no way to
  // add, so it shows no builder either.
  const customizer = useProductCustomizer({
    customizer: product.customizer,
    basePrice: displayPrice,
    lineQty: subscribeQuantity,
  });
  const customizerOn = customizer.enabled && cartEnabled;
  const configuredPrice = customizerOn
    ? displayPrice + customizer.addOnTotal
    : null;
  const configuredCompareAt =
    customizerOn &&
    displayCompareAtPrice != null &&
    displayCompareAtPrice > displayPrice
      ? displayCompareAtPrice + customizer.addOnTotal
      : null;
  useEffect(() => {
    onConfiguredPriceChange?.(
      configuredPrice === null
        ? null
        : { price: configuredPrice, compareAtPrice: configuredCompareAt },
    );
  }, [configuredPrice, configuredCompareAt, onConfiguredPriceChange]);

  const customizerElement = customizerOn ? (
    <ProductCustomizer
      controller={customizer}
      classNames={ELEGANT_CUSTOMIZER_CLASSNAMES}
      trayClassNames={ELEGANT_TRAY_CLASSNAMES}
    />
  ) : null;

  const handleSimpleAdd = () => {
    if (!customizerOn) {
      handleAddToCart();
      return;
    }
    // Incomplete build: show the errors (and focus the first) instead.
    if (!customizer.revealErrors()) return;
    handleAddToCartWith((item) => applyCustomizerToCartItem(item, customizer));
  };

  const subscribePanel = (
    <SubscribePanel
      product={product}
      selectedVariantId={selectedVariantId}
      quantity={subscribeQuantity}
      available={inStock}
      className="mt-6"
      ctaClassName="el-btn-primary inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--el-ink)] px-7 text-[13px] font-medium tracking-[0.08em] text-[var(--el-paper)] uppercase transition-colors"
    />
  );

  if (additional?.comingSoon) {
    return (
      <>
        <div
          style={{
            padding: "16px 20px",
            borderRadius: 8,
            border: "1px solid rgba(217, 185, 168, 0.5)",
            background: "rgba(217, 185, 168, 0.12)",
            marginBottom: 24,
          }}
        >
          <p
            {...fieldAttr("elegant.product.coming-soon-heading")}
            style={{
              fontFamily: "var(--font-mono, ui-monospace)",
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--el-blush, #d9b9a8)",
              marginBottom: 4,
            }}
          >
            {comingSoonHeading}
          </p>
          {comingSoonBody ? (
            <p
              {...fieldAttr("elegant.product.coming-soon-body")}
              style={{
                fontSize: 14,
                color: "var(--el-ink-soft, #6b6659)",
                fontFamily: "var(--font-sans, sans-serif)",
                whiteSpace: "pre-line",
              }}
            >
              {comingSoonBody}
            </p>
          ) : null}
        </div>
        {subscribePanel}
      </>
    );
  }

  if (hasVariants) {
    return (
      <>
        <ElegantVariantSelector
          product={product}
          selectedVariantId={selectedVariantId}
          setSelectedVariantId={setSelectedVariantId}
          onQuantityChange={setVariantQuantity}
          customizer={customizerOn ? customizer : undefined}
          customizerSlot={customizerElement}
        />
        {subscribePanel}
      </>
    );
  }

  if (!inStock) {
    return (
      <>
        <div style={{ marginBottom: 24 }}>
          <button
            type="button"
            aria-disabled="true"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              padding: "16px 28px",
              borderRadius: 999,
              fontSize: 13,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontWeight: 500,
              background: "var(--el-cream-3, #e0d9c8)",
              color: "var(--el-ink-soft, #6b6659)",
              border: "none",
              cursor: "not-allowed",
              fontFamily: "var(--font-sans, sans-serif)",
            }}
          >
            Out of Stock
          </button>
          <NotifyMeForm
            productId={product.id}
            variantId={selectedVariantId}
            className="mt-4"
            message="Get notified when it's back in stock."
            messageClassName="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--el-ink-soft)]"
            inputClassName="rounded-full border-[var(--el-line)] px-4"
            buttonClassName="rounded-full uppercase tracking-[0.08em] text-xs"
          />
        </div>
        {subscribePanel}
      </>
    );
  }

  return (
    <>
      {customizerElement && canAddMore && (
        <div style={{ marginBottom: 24 }}>{customizerElement}</div>
      )}

      {/* Catalog mode (B6.11): no qty or Add to bag when `cart` is off */}
      {cartEnabled && canAddMore && (
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontFamily: "var(--font-mono, ui-monospace)",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--el-ink-soft, #6b6659)",
              marginBottom: 12,
            }}
          >
            Quantity
          </div>
          {/* Qty stepper */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              border: "1px solid var(--el-line, rgba(28,26,23,0.12))",
              borderRadius: 999,
              padding: "4px 6px",
            }}
          >
            <button
              type="button"
              onClick={handleDecrement}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
              style={{
                width: 28,
                height: 28,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
                border: "none",
                background: "transparent",
                cursor: quantity <= 1 ? "not-allowed" : "pointer",
                color:
                  quantity <= 1
                    ? "var(--el-ink-mute, #9a9485)"
                    : "var(--el-ink, #1c1a17)",
                transition: `background 0.2s ${ease}`,
              }}
              className="el-qty-btn"
            >
              <Minus aria-hidden={true} style={{ width: 13, height: 13 }} />
            </button>
            <span
              aria-live="polite"
              aria-atomic="true"
              style={{
                minWidth: 24,
                textAlign: "center",
                fontSize: 14,
                fontWeight: 500,
                color: "var(--el-ink, #1c1a17)",
                fontFamily: "var(--font-sans, sans-serif)",
              }}
            >
              {quantity}
            </span>
            <button
              type="button"
              onClick={handleIncrement}
              disabled={quantity >= remainingStock}
              aria-label="Increase quantity"
              style={{
                width: 28,
                height: 28,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
                border: "none",
                background: "transparent",
                cursor: quantity >= remainingStock ? "not-allowed" : "pointer",
                color:
                  quantity >= remainingStock
                    ? "var(--el-ink-mute, #9a9485)"
                    : "var(--el-ink, #1c1a17)",
                transition: `background 0.2s ${ease}`,
              }}
              className="el-qty-btn"
            >
              <Plus aria-hidden={true} style={{ width: 13, height: 13 }} />
            </button>
            {remainingStock <= 5 && remainingStock > 0 && (
              <span
                style={{
                  fontSize: 11,
                  color: "var(--el-ink-soft, #6b6659)",
                  paddingRight: 8,
                  fontFamily: "var(--font-mono, ui-monospace)",
                  letterSpacing: "0.1em",
                }}
              >
                {remainingStock === 1 ? "Last one" : `${remainingStock} left`}
              </span>
            )}
          </div>
        </div>
      )}

      {cartEnabled && (
        <>
          {/* Add to bag */}
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "stretch",
              marginBottom: 24,
            }}
          >
            <button
              type="button"
              onClick={handleSimpleAdd}
              style={{
                flex: 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                padding: "16px 28px",
                borderRadius: 999,
                fontSize: 13,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontWeight: 500,
                background: justAdded
                  ? "var(--el-sage, #4a5240)"
                  : "var(--el-ink, #1c1a17)",
                color: "var(--el-paper, #fbf8f2)",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-sans, sans-serif)",
                transition: `background 0.4s ${ease}`,
              }}
            >
              {justAdded ? (
                <>
                  <Check aria-hidden={true} style={{ width: 14, height: 14 }} />
                  Added to bag
                </>
              ) : (
                <>
                  Add to bag ·{" "}
                  {formatPrice((configuredPrice ?? displayPrice) * quantity)}
                  <ArrowRight
                    aria-hidden={true}
                    style={{ width: 14, height: 14 }}
                  />
                </>
              )}
            </button>
          </div>
          <span className="sr-only" aria-live="polite" aria-atomic="true">
            {justAdded ? "Added to bag" : ""}
          </span>
        </>
      )}

      {!cartEnabled && remainingStock <= 5 && remainingStock > 0 && (
        <p
          style={{
            fontFamily: "var(--font-mono, ui-monospace)",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--el-ink-soft, #6b6659)",
            marginBottom: 16,
          }}
        >
          {remainingStock === 1 ? "Last one" : `${remainingStock} left`}
        </p>
      )}

      {product.trackInventory &&
        product.allowBackorders &&
        (product.inventoryQty ?? 0) === 0 && (
          <p
            style={{
              fontFamily: "var(--font-mono, ui-monospace)",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--el-ink-soft, #6b6659)",
              marginBottom: 16,
            }}
          >
            Backordered · ships when available
          </p>
        )}

      {cartEnabled && !canAddMore && inStock && (
        <p
          style={{
            fontFamily: "var(--font-mono, ui-monospace)",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--el-blush, #d9b9a8)",
            marginBottom: 16,
          }}
        >
          Maximum quantity in cart
        </p>
      )}
      {subscribePanel}
    </>
  );
}
