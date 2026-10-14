"use client";

import { useEffect, useState } from "react";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";

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
  HAPPY_BAMBOO_CUSTOMIZER_CLASSNAMES,
  HAPPY_BAMBOO_CUSTOMIZER_TRAY_CLASSNAMES,
} from "./happy-bamboo-customizer-styles";
import { HappyBambooVariantSelector } from "./happy-bamboo-variant-selector";

type HappyBambooProductActionsProps = DefaultProductPageTemplateProps & {
  /** Resolved `happy-bamboo.product.coming-soon-heading` (page resolves fields). */
  comingSoonHeading: string;
  /** Resolved `happy-bamboo.product.coming-soon-body`; blank hides the line. */
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

export function HappyBambooProductActions({
  product,
  comingSoonHeading,
  comingSoonBody,
  onConfiguredPriceChange,
}: HappyBambooProductActionsProps) {
  const {
    formatPrice,
    inStock,
    variantOptions,
    displayPrice,
    displayCompareAtPrice,
    handleAddToCartWith,
    additionalFields,
    canAddMore,
    handleDecrement,
    handleIncrement,
    quantity,
    setSelectedVariantId,
    selectedVariantId,
    justAdded,
    remainingStock,
    isInventoryTracked,
    cartEnabled,
  } = useProduct(product);

  const hasVariants = Object.keys(variantOptions).length > 0;

  // `HappyBambooVariantSelector` keeps its own quantity stepper (separate
  // from `useProduct`'s, which stays 1 for variant products) — mirror its
  // value here so `SubscribePanel` links to `/subscribe` with what the
  // shopper actually picked instead of always `qty=1`.
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
      classNames={HAPPY_BAMBOO_CUSTOMIZER_CLASSNAMES}
      trayClassNames={HAPPY_BAMBOO_CUSTOMIZER_TRAY_CLASSNAMES}
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
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-800 dark:bg-amber-950">
          <p
            {...fieldAttr("happy-bamboo.product.coming-soon-heading")}
            className="font-semibold text-amber-700 dark:text-amber-300"
          >
            {comingSoonHeading}
          </p>
          {comingSoonBody.trim() ? (
            <p
              {...fieldAttr("happy-bamboo.product.coming-soon-body")}
              className="mt-1 text-sm text-amber-700 dark:text-amber-400"
            >
              {comingSoonBody}
            </p>
          ) : null}
        </div>
      ) : hasVariants ? (
        <HappyBambooVariantSelector
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
            aria-disabled={true}
            onClick={(e) => e.preventDefault()}
            className="flex aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
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
            <>
              {/* Quantity Selector */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex flex-col gap-1.5">
                  {/* Catalog mode (B6.11): no qty or Add to Cart when `cart` is off */}
                  {cartEnabled && (
                    <div className="border-border flex items-center justify-between gap-1 rounded-lg border">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-10"
                        onClick={() => handleDecrement()}
                        disabled={quantity <= 1}
                        aria-label="Decrease quantity"
                      >
                        <Minus className="size-4" />
                      </Button>
                      <span className="text-foreground w-10 text-center text-base font-semibold">
                        {quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-10"
                        onClick={() => handleIncrement()}
                        disabled={quantity >= remainingStock}
                        aria-label="Increase quantity"
                        aria-describedby={
                          isInventoryTracked
                            ? "hb-actions-stock-msg"
                            : undefined
                        }
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  )}
                  {isInventoryTracked && !product.allowBackorders && (
                    <span
                      id="hb-actions-stock-msg"
                      className="text-muted-foreground text-sm"
                    >
                      {remainingStock > 1
                        ? `${remainingStock} available`
                        : "Last one!"}
                    </span>
                  )}
                </div>
                {cartEnabled && (
                  <Button size="lg" onClick={handleSimpleAdd} className="flex">
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
                  </Button>
                )}
              </div>
              {cartEnabled && (
                <span
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                  className="sr-only"
                >
                  {justAdded ? "Added to cart" : ""}
                </span>
              )}
              {product.trackInventory &&
                product.allowBackorders &&
                (product.inventoryQty ?? 0) === 0 && (
                  <p className="text-muted-foreground text-sm">
                    Backordered — ships when available
                  </p>
                )}
            </>
          )}

          {cartEnabled && !canAddMore && inStock && (
            <p className="mt-3 text-center text-sm text-amber-500">
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
      />
    </>
  );
}
