"use client";

import { useEffect, useState } from "react";
import { Check, Minus, Plus } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { useProduct } from "~/hooks/use-product";
import { applyCustomizerToCartItem } from "~/components/customizer/apply-to-cart-item";
import { ProductCustomizer } from "~/components/customizer/product-customizer";
import { useProductCustomizer } from "~/components/customizer/use-product-customizer";
import { NotifyMeForm } from "~/app/(storefront)/_components/product/notify-me-form";
import { SubscribePanel } from "~/app/(storefront)/_components/product/subscribe-panel";

import { DarkTrendVariantSelector } from "./dark-trend-variant-selector";

type DarkTrendProductActionsProps = DefaultProductPageTemplateProps & {
  /** Resolved `dark-trend.product.coming-soon-heading`. */
  comingSoonHeading: string;
  /** Resolved `dark-trend.product.coming-soon-body`; blank hides the line. */
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

// Dark surfaces: cards on the near-black page, white text, violet-400 for the
// selected ring (violet-600 is under 3:1 against the page background) and a
// white focus outline matching `.dark-trend *:focus-visible`.
const DARK_TREND_CUSTOMIZER_CLASSNAMES = {
  legend: "text-sm font-medium text-white",
  help: "text-white/70",
  count: "text-white/70",
  value:
    "bg-card rounded-md border-white/30 text-white hover:bg-white/10 data-[selected=true]:border-violet-400 data-[selected=true]:ring-violet-400 has-[:focus-visible]:outline-white",
  valueImage: "rounded-sm",
  valuePrice: "text-white/70",
  clear: "text-white/70 hover:text-white",
  limit: "text-white/70",
  textInput:
    "bg-card rounded-md border-white/30 text-white placeholder:text-white/40",
  textCounter: "text-white/70",
};

const DARK_TREND_TRAY_CLASSNAMES = {
  item: "bg-card border-white/20 text-white",
};

export function DarkTrendProductActions({
  product,
  comingSoonHeading,
  comingSoonBody,
  onConfiguredPriceChange,
}: DarkTrendProductActionsProps) {
  const {
    inStock,
    variantOptions,
    handleAddToCart,
    handleAddToCartWith,
    displayPrice,
    displayCompareAtPrice,
    remainingStock,
    canAddMore,
    handleDecrement,
    handleIncrement,
    quantity,
    setSelectedVariantId,
    selectedVariantId,
    additionalFields,
    isInventoryTracked,
    justAdded,
    cartEnabled,
  } = useProduct(product);

  const [liveMessage, setLiveMessage] = useState("");

  const showBackorderNote =
    product.trackInventory &&
    product.allowBackorders &&
    (product.inventoryQty ?? 0) === 0;

  const hasVariants = Object.keys(variantOptions).length > 0;

  // `DarkTrendVariantSelector` keeps its own quantity stepper (separate from
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
      classNames={DARK_TREND_CUSTOMIZER_CLASSNAMES}
      trayClassNames={DARK_TREND_TRAY_CLASSNAMES}
    />
  ) : null;

  const addToCart = () => {
    if (!cartEnabled || !canAddMore) return;
    if (customizerOn) {
      // Incomplete build: show the errors (and focus the first) instead.
      if (!customizer.revealErrors()) return;
      handleAddToCartWith((item) =>
        applyCustomizerToCartItem(item, customizer),
      );
    } else {
      handleAddToCart();
    }
    setLiveMessage(`Added ${quantity} × ${product.name} to cart`);
    setTimeout(() => {
      setLiveMessage("");
    }, 2000);
  };

  return (
    <>
      {additionalFields?.comingSoon ? (
        <div className="bg-card rounded-md border border-white/10 px-5 py-4">
          <p
            {...fieldAttr("dark-trend.product.coming-soon-heading")}
            className="text-sm font-semibold tracking-[0.2em] text-purple-400 uppercase"
          >
            {comingSoonHeading}
          </p>
          {comingSoonBody.trim() ? (
            <p
              {...fieldAttr("dark-trend.product.coming-soon-body")}
              className="mt-2 text-sm leading-relaxed text-white/70"
            >
              {comingSoonBody}
            </p>
          ) : null}
        </div>
      ) : hasVariants ? (
        <DarkTrendVariantSelector
          product={product}
          setSelectedVariantId={setSelectedVariantId}
          onQuantityChange={setVariantQuantity}
          customizer={customizerOn ? customizer : undefined}
          customizerSlot={customizerElement}
        />
      ) : !inStock ? (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            aria-disabled="true"
            onClick={(e) => e.preventDefault()}
            className="bg-primary hover:bg-primary/90 inline-flex flex-1 items-center justify-center gap-2 rounded-md px-8 py-4 text-sm font-semibold tracking-wider text-white uppercase opacity-50 transition-all"
          >
            Out of Stock
          </button>
          <NotifyMeForm
            productId={product.id}
            message="Get notified when it's back in stock."
            className="text-white"
            messageClassName="text-sm text-white/70"
            inputClassName="rounded-md border-white/20 placeholder:text-white/40"
            buttonClassName="rounded-md border-white/40"
          />
        </div>
      ) : (
        <>
          {/* Visually-hidden live region for add-to-cart announcements */}
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {liveMessage}
          </div>

          {/* Catalog mode (B6.11): stock line only, no qty/Add to Cart */}
          {!cartEnabled && isInventoryTracked && inStock && (
            <p className="mb-8 text-sm text-white/60">
              {remainingStock > 1 ? `${remainingStock} available` : "Last one!"}
            </p>
          )}

          {canAddMore && (
            <>
              {customizerElement && (
                <div className="mb-8">{customizerElement}</div>
              )}
              {/* Quantity Selector */}
              {cartEnabled && (
                <div className="mb-8">
                  <div
                    role="group"
                    aria-label="Quantity"
                    className="inline-flex flex-col gap-2"
                  >
                    <span className="block text-sm font-medium text-white">
                      Quantity
                    </span>
                    <div className="bg-card inline-flex items-center gap-4 rounded-md px-4 py-2">
                      <button
                        type="button"
                        onClick={handleDecrement}
                        disabled={quantity <= 1}
                        className="flex h-10 w-10 items-center justify-center rounded-sm bg-white/10 text-white/60 transition-colors hover:bg-white/20 hover:text-white disabled:opacity-50"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <span
                        aria-live="polite"
                        aria-atomic="true"
                        className="w-8 text-center font-medium text-white"
                      >
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={handleIncrement}
                        disabled={quantity >= remainingStock}
                        className="flex h-10 w-10 items-center justify-center rounded-sm bg-white/10 text-white/60 transition-colors hover:bg-white/20 hover:text-white disabled:opacity-50"
                        aria-label="Increase quantity"
                        aria-describedby={
                          isInventoryTracked
                            ? "dt-actions-stock-msg"
                            : undefined
                        }
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                      </button>

                      {isInventoryTracked && (
                        <span
                          id="dt-actions-stock-msg"
                          className="text-sm text-white/60"
                        >
                          {remainingStock > 1
                            ? `${remainingStock} available`
                            : "Last one!"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Add to Cart Buttons */}
              {(cartEnabled || showBackorderNote) && (
                <div className="mb-10 flex flex-col gap-4 sm:flex-row">
                  {cartEnabled && (
                    <button
                      type="button"
                      onClick={addToCart}
                      className={`inline-flex flex-1 items-center justify-center gap-2 rounded-md px-8 py-4 text-sm font-semibold tracking-wider text-white uppercase transition-all ${
                        justAdded
                          ? "bg-primary"
                          : "bg-primary hover:bg-primary/90"
                      }`}
                    >
                      {justAdded ? (
                        <>
                          <Check className="h-4 w-4" aria-hidden="true" />
                          Added to Cart
                        </>
                      ) : (
                        "Add to Cart"
                      )}
                    </button>
                  )}
                  {showBackorderNote && (
                    <p className="text-muted-foreground text-sm">
                      Backordered — ships when available
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {cartEnabled && !canAddMore && inStock && (
            <p className="text-muted-foreground mt-3 text-center text-sm">
              You have the maximum available quantity in your cart
            </p>
          )}
        </>
      )}
      <SubscribePanel
        product={product}
        selectedVariantId={selectedVariantId}
        quantity={subscribeQuantity}
        available={inStock}
        className="mt-8"
        ctaClassName="bg-primary hover:bg-primary/90 inline-flex h-11 items-center justify-center gap-2 rounded-md px-8 text-sm font-semibold tracking-wider text-white uppercase transition-all"
      />
    </>
  );
}
