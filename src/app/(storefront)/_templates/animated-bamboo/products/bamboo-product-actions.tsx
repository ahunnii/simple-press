"use client";

import { useEffect, useState } from "react";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import { useProduct } from "~/hooks/use-product";
import { applyCustomizerToCartItem } from "~/components/customizer/apply-to-cart-item";
import { ProductCustomizer } from "~/components/customizer/product-customizer";
import { useProductCustomizer } from "~/components/customizer/use-product-customizer";
import { NotifyMeForm } from "~/app/(storefront)/_components/product/notify-me-form";
import { SubscribePanel } from "~/app/(storefront)/_components/product/subscribe-panel";

import {
  BAMBOO_CUSTOMIZER_CLASSNAMES,
  BAMBOO_CUSTOMIZER_TRAY_CLASSNAMES,
} from "./bamboo-customizer-styles";
import { BambooVariantSelector } from "./bamboo-variant-selector";

/**
 * Purchase actions: Coming Soon notice, out-of-stock + NotifyMeForm, the
 * variant picker (delegates entirely to `BambooVariantSelector` when the
 * product has variants), or the plain qty-stepper + Add to Cart pair for a
 * simple product. Restyled onto `.bamboo-qty-stepper` /
 * `.bamboo-btn.bamboo-btn-primary` (pine, built-in underline-swipe hover) —
 * wiring (`useProduct`, `handleAddToCart`, `canAddMore`, stock math) is
 * unchanged.
 */
type BambooProductActionsProps = DefaultProductPageTemplateProps & {
  /**
   * Notified with the live configured price (selected variant + chosen
   * options) while the product has a customizer, and `null` otherwise, so the
   * page can show it in place of the base price.
   */
  onConfiguredPriceChange?: (
    price: { price: number; compareAtPrice: number | null } | null,
  ) => void;
};

export function BambooProductActions({
  product,
  onConfiguredPriceChange,
}: BambooProductActionsProps) {
  const {
    formatPrice,
    inStock,
    variantOptions,
    displayPrice,
    displayCompareAtPrice,
    handleAddToCartWith,
    canAddMore,
    handleDecrement,
    handleIncrement,
    quantity,
    setSelectedVariantId,
    selectedVariantId,
    additionalFields,
    justAdded,
    remainingStock,
    isInventoryTracked,
    cartEnabled,
  } = useProduct(product);

  const hasVariants = Object.keys(variantOptions).length > 0;

  // `BambooVariantSelector` keeps its own quantity stepper (separate from
  // `useProduct`'s, which stays 1 for variant products) — mirror its value
  // here so `SubscribePanel` links to `/subscribe` with what the shopper
  // actually picked instead of always `qty=1`.
  const [variantQuantity, setVariantQuantity] = useState(1);
  const subscribeQuantity = hasVariants ? variantQuantity : quantity;

  // Product options (customizer). `product.customizer` is null when the
  // feature is off or the product has no groups; then none of this shows.
  // `displayPrice` follows the selected variant (the selector reports it
  // through `setSelectedVariantId`).
  const customizer = useProductCustomizer({
    customizer: product.customizer,
    basePrice: displayPrice,
    lineQty: subscribeQuantity,
  });
  const configuredPrice = customizer.enabled
    ? displayPrice + customizer.addOnTotal
    : null;
  const configuredCompareAt =
    customizer.enabled &&
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

  const customizerElement = customizer.enabled ? (
    <ProductCustomizer
      controller={customizer}
      classNames={BAMBOO_CUSTOMIZER_CLASSNAMES}
      trayClassNames={BAMBOO_CUSTOMIZER_TRAY_CLASSNAMES}
    />
  ) : null;

  const handleSimpleAdd = () => {
    if (!customizer.enabled) {
      handleAddToCartWith((item) => item);
      return;
    }
    // Incomplete build: show the errors (and focus the first) instead.
    if (!customizer.revealErrors()) return;
    handleAddToCartWith((item) => applyCustomizerToCartItem(item, customizer));
  };

  return (
    <>
      {additionalFields?.comingSoon ? (
        <div className="bamboo-torn-card px-5 py-4">
          <p className="font-heading font-semibold text-[var(--bamboo-pine)]">
            Coming Soon
          </p>
          <p className="mt-1 text-sm text-[var(--bamboo-ink-soft)]">
            This product isn&apos;t available yet. Check back later!
          </p>
        </div>
      ) : hasVariants ? (
        <BambooVariantSelector
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
            className="bamboo-btn bamboo-btn-primary cursor-not-allowed justify-center opacity-50"
          >
            Out of Stock
          </button>
          <NotifyMeForm
            productId={product.id}
            message="Get notified when it's back in stock."
            messageClassName="text-[var(--bamboo-ink-soft)] text-sm"
            inputClassName="rounded-full border-2 border-[var(--bamboo-outline)] bg-[var(--bamboo-roll)] focus-visible:border-[var(--bamboo-pine)]"
            buttonClassName="bamboo-btn bamboo-btn-primary"
          />
        </div>
      ) : (
        <>
          {customizerElement && <div className="mb-5">{customizerElement}</div>}
          {canAddMore && (
            <>
              {/* Catalog mode (B6.11): no qty or Add to Cart when `cart` is off */}
              {cartEnabled && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="bamboo-qty-stepper">
                    <button
                      type="button"
                      onClick={() => handleDecrement()}
                      disabled={quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="size-4" aria-hidden="true" />
                    </button>
                    <span aria-live="polite" aria-atomic="true">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleIncrement()}
                      disabled={quantity >= remainingStock}
                      aria-label="Increase quantity"
                      aria-describedby={
                        isInventoryTracked
                          ? "bamboo-actions-stock-msg"
                          : undefined
                      }
                    >
                      <Plus className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleSimpleAdd}
                    className="bamboo-btn bamboo-btn-primary flex-1 justify-center gap-2 sm:flex-none"
                  >
                    {justAdded ? (
                      <>
                        <Check className="h-4 w-4" aria-hidden="true" />
                        Added to Cart
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="size-5" aria-hidden="true" />
                        Add to Cart -{" "}
                        {formatPrice(configuredPrice ?? displayPrice)}
                      </>
                    )}
                  </button>
                  {/* S-1: live region announces add-to-cart confirmation */}
                  <div
                    aria-live="polite"
                    aria-atomic="true"
                    className="sr-only"
                  >
                    {justAdded ? `${product.name} added to cart` : ""}
                  </div>
                </div>
              )}
              {isInventoryTracked &&
                !product.allowBackorders &&
                remainingStock <= 1 && (
                  <p
                    id="bamboo-actions-stock-msg"
                    className="mt-2 text-[0.86rem] text-[var(--bamboo-ink-soft)]"
                  >
                    Last one!
                  </p>
                )}
              {product.trackInventory &&
                product.allowBackorders &&
                (product.inventoryQty ?? 0) === 0 && (
                  <p className="text-[0.9rem] text-[var(--bamboo-ink-soft)]">
                    Backordered — ships when available
                  </p>
                )}
            </>
          )}

          {cartEnabled && !canAddMore && inStock && (
            <p className="mt-3 text-center text-sm text-[var(--bamboo-terracotta-deep)]">
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
        className="mt-4"
        ctaClassName="bamboo-btn bamboo-btn-primary justify-center"
      />
    </>
  );
}
