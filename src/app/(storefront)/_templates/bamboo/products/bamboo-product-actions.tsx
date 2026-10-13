"use client";

import { useEffect, useState } from "react";
import { Check, Minus, Plus, ShoppingCart } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { useProduct } from "~/hooks/use-product";
import { Button } from "~/components/ui/button";
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

type BambooProductActionsProps = DefaultProductPageTemplateProps & {
  /** Resolved `bamboo.product.coming-soon-heading` (page resolves fields). */
  comingSoonHeading: string;
  /** Resolved `bamboo.product.coming-soon-body`; blank hides the line. */
  comingSoonBody: string;
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
  comingSoonHeading,
  comingSoonBody,
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
        <div className="rounded-2xl border border-[var(--bam-hairline)] bg-[var(--bam-cream-deep)] px-5 py-4">
          <p
            {...fieldAttr("bamboo.product.coming-soon-heading")}
            className="text-foreground font-semibold"
          >
            {comingSoonHeading}
          </p>
          {comingSoonBody.trim() ? (
            <p
              {...fieldAttr("bamboo.product.coming-soon-body")}
              className="text-muted-foreground mt-1 text-sm"
            >
              {comingSoonBody}
            </p>
          ) : null}
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
          <Button
            size="lg"
            aria-disabled="true"
            onClick={(e) => e.preventDefault()}
            className="flex cursor-not-allowed rounded-full opacity-50"
          >
            Out of Stock
          </Button>
          <NotifyMeForm
            productId={product.id}
            message="Get notified when it's back in stock."
            messageClassName="text-muted-foreground text-sm"
            inputClassName="border-border rounded-lg"
            buttonClassName="rounded-lg"
          />
        </div>
      ) : (
        <>
          {customizerElement && <div className="mb-4">{customizerElement}</div>}
          {canAddMore && (
            <div className="flex flex-col gap-2">
              {/* Catalog mode (B6.11): no qty or Add to Cart when `cart` is off */}
              {cartEnabled && (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="border-border flex h-12 items-center gap-1 rounded-lg border">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-11"
                      onClick={() => handleDecrement()}
                      disabled={quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="size-4" aria-hidden="true" />
                    </Button>
                    <span
                      className="text-foreground w-10 text-center text-base font-semibold"
                      aria-live="polite"
                      aria-atomic="true"
                    >
                      {quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-11"
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
                    </Button>
                  </div>
                  <Button
                    size="lg"
                    onClick={handleSimpleAdd}
                    className="h-12 gap-2 rounded-full hover:bg-[var(--bam-forest-deep)]"
                  >
                    {justAdded ? (
                      <>
                        <Check className="h-4 w-4" aria-hidden="true" />
                        Added to Cart
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="size-5" aria-hidden="true" />
                        Add to Cart -{" "}
                        {formatPrice(configuredPrice ?? displayPrice)}
                      </>
                    )}
                  </Button>
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
              {isInventoryTracked && !product.allowBackorders && (
                <span
                  id="bamboo-actions-stock-msg"
                  className="text-muted-foreground text-sm"
                >
                  {remainingStock > 1
                    ? `${remainingStock} available`
                    : "Last one!"}
                </span>
              )}
              {product.trackInventory &&
                product.allowBackorders &&
                (product.inventoryQty ?? 0) === 0 && (
                  <p className="text-muted-foreground text-sm">
                    Backordered — ships when available
                  </p>
                )}
            </div>
          )}

          {cartEnabled && !canAddMore && inStock && (
            <p className="mt-3 text-center text-sm text-amber-700">
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
        ctaClassName="bg-primary text-primary-foreground hover:bg-[var(--bam-forest-deep)] focus-visible:ring-ring inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      />
    </>
  );
}
