"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { useProduct } from "~/hooks/use-product";
import { applyCustomizerToCartItem } from "~/components/customizer/apply-to-cart-item";
import { ProductCustomizer } from "~/components/customizer/product-customizer";
import { useProductCustomizer } from "~/components/customizer/use-product-customizer";
import { NotifyMeForm } from "~/app/(storefront)/_components/product/notify-me-form";
import { SubscribePanel } from "~/app/(storefront)/_components/product/subscribe-panel";

import {
  DEFAULT_PRODUCT_COMING_SOON_BODY,
  DEFAULT_PRODUCT_COMING_SOON_HEADING,
} from ".";
import { DefaultVariantSelector } from "./default-variant-selector";

type Props = DefaultProductPageTemplateProps & {
  /**
   * Resolved `default.product.coming-soon-*` copy from the page. Optional so
   * a caller that doesn't pass them still gets the built-in text; a passed
   * "" means the owner blanked it (the body then hides).
   */
  comingSoonHeading?: string;
  comingSoonBody?: string;
  /**
   * Notified with the live configured price (base of the selected variant +
   * chosen options) while the product has a customizer, and `null`
   * otherwise, so the page can show it in place of the base price.
   */
  onConfiguredPriceChange?: (
    price: { price: number; compareAtPrice: number | null } | null,
  ) => void;
};

const DEFAULT_CUSTOMIZER_CLASSNAMES = {
  legend: "text-[11px] font-medium tracking-[0.14em] text-[#6b6b6b] uppercase",
  value: "rounded-[var(--radius)]",
  textInput: "rounded-[var(--radius)] border-[#e8e8e8]",
};

export function DefaultProductActions({
  product,
  comingSoonHeading = DEFAULT_PRODUCT_COMING_SOON_HEADING,
  comingSoonBody = DEFAULT_PRODUCT_COMING_SOON_BODY,
  onConfiguredPriceChange,
}: Props) {
  const {
    inStock,
    variantOptions,
    handleAddToCart,
    handleAddToCartWith,
    displayPrice,
    displayCompareAtPrice,
    canAddMore,
    handleDecrement,
    handleIncrement,
    quantity,
    additionalFields,
    setSelectedVariantId,
    selectedVariantId,
    justAdded,
    cartEnabled,
  } = useProduct(product);

  const hasVariants = Object.keys(variantOptions).length > 0;

  // `DefaultVariantSelector` keeps its own quantity stepper (separate from
  // `useProduct`'s, which stays 1 for variant products) — mirror its value
  // here so `SubscribePanel` links to `/subscribe` with what the shopper
  // actually picked instead of always `qty=1`.
  const [variantQuantity, setVariantQuantity] = useState(1);
  const subscribeQuantity = hasVariants ? variantQuantity : quantity;

  // Product options (customizer). `product.customizer` is null when the
  // feature is off or the product has no groups — then none of this shows.
  // `displayPrice` follows the selected variant (the selector reports it
  // through `setSelectedVariantId`).
  const customizer = useProductCustomizer({
    customizer: product.customizer,
    basePrice: displayPrice,
    lineQty: subscribeQuantity,
  });
  // Catalog mode (`cart` off) has no way to add, so it shows no builder.
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
      classNames={DEFAULT_CUSTOMIZER_CLASSNAMES}
    />
  ) : null;

  const handleSimpleAdd = () => {
    if (!customizerOn) {
      handleAddToCart();
      return;
    }
    if (!customizer.revealErrors()) return;
    handleAddToCartWith((item) => applyCustomizerToCartItem(item, customizer));
  };

  return (
    <>
      {additionalFields?.comingSoon ? (
        <div className="rounded-[var(--radius)] border border-amber-200 bg-amber-50 px-5 py-4">
          <p
            {...fieldAttr("default.product.coming-soon-heading")}
            className="font-medium text-amber-700"
          >
            {comingSoonHeading}
          </p>
          {comingSoonBody && (
            <p
              {...fieldAttr("default.product.coming-soon-body")}
              className="mt-1 text-sm text-amber-700"
            >
              {comingSoonBody}
            </p>
          )}
        </div>
      ) : hasVariants ? (
        <DefaultVariantSelector
          product={product}
          setSelectedVariantId={setSelectedVariantId}
          onQuantityChange={setVariantQuantity}
          customizer={customizer}
          customizerSlot={customizerElement}
        />
      ) : !inStock ? (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            aria-disabled="true"
            onClick={(e) => e.preventDefault()}
            className="h-12 w-full cursor-not-allowed rounded-[var(--radius)] border border-[#e8e8e8] text-sm font-medium text-[#6b6b6b]"
          >
            Out of Stock
          </button>
          <NotifyMeForm
            productId={product.id}
            message="Get notified when it's back in stock."
            messageClassName="text-sm text-[#6b6b6b]"
            inputClassName="rounded-[var(--radius)] border-[#e8e8e8]"
            buttonClassName="rounded-[var(--radius)] border-[#0a0a0a]"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {customizerElement && <div className="mb-2">{customizerElement}</div>}
          {/* Catalog mode (B6.11): no qty or Add to cart when `cart` is off */}
          {cartEnabled && canAddMore && (
            <div className="flex items-center gap-3">
              {/* Qty stepper */}
              <div
                role="group"
                aria-label="Quantity"
                className="inline-flex h-12 w-[120px] shrink-0 items-center rounded-[var(--radius)] border border-[#e8e8e8]"
              >
                <button
                  type="button"
                  onClick={handleDecrement}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                  className="flex h-full flex-1 items-center justify-center rounded-l-[var(--radius)] text-lg font-light transition-colors hover:bg-[#f6f6f6] disabled:opacity-30"
                >
                  <span aria-hidden="true">−</span>
                </button>
                <span
                  className="w-10 text-center text-sm font-medium"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  aria-label="Increase quantity"
                  className="flex h-full flex-1 items-center justify-center rounded-r-[var(--radius)] text-lg font-light transition-colors hover:bg-[#f6f6f6]"
                >
                  <span aria-hidden="true">+</span>
                </button>
              </div>

              {/* Add to cart */}
              <button
                type="button"
                onClick={handleSimpleAdd}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[var(--radius)] bg-[#0a0a0a] text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a] active:translate-y-px"
              >
                {justAdded ? (
                  <>
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Added to bag
                  </>
                ) : (
                  `Add to cart`
                )}
              </button>
              {/* Live region sibling — announces state change reliably across all AT */}
              <span className="sr-only" aria-live="polite" aria-atomic="true">
                {justAdded ? "Added to bag" : ""}
              </span>
            </div>
          )}

          {/* Stock count hint */}
          {product.trackInventory && (product.inventoryQty ?? 0) > 0 && (
            <p className="text-xs text-[#6b6b6b]">
              {product.inventoryQty} available
            </p>
          )}
          {product.trackInventory &&
            product.allowBackorders &&
            (product.inventoryQty ?? 0) === 0 && (
              <p className="text-xs text-[#6b6b6b]">
                Backordered — ships when available
              </p>
            )}

          {cartEnabled && !canAddMore && inStock && (
            <p className="text-sm text-amber-700">
              You have the maximum available quantity in your cart.
            </p>
          )}
        </div>
      )}
      <SubscribePanel
        product={product}
        selectedVariantId={selectedVariantId}
        quantity={subscribeQuantity}
        available={inStock}
        className="mt-4"
      />
    </>
  );
}
