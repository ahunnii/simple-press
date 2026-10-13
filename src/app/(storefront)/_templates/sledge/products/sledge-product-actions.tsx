"use client";

import { useEffect, useState } from "react";
import { Check, Minus, Plus } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";
import { useProduct } from "~/hooks/use-product";
import { applyCustomizerToCartItem } from "~/components/customizer/apply-to-cart-item";
import { ProductCustomizer } from "~/components/customizer/product-customizer";
import { useProductCustomizer } from "~/components/customizer/use-product-customizer";
import { NotifyMeForm } from "~/app/(storefront)/_components/product/notify-me-form";
import { SubscribePanel } from "~/app/(storefront)/_components/product/subscribe-panel";

import { SledgeVariantSelector } from "./sledge-variant-selector";

type SledgeProductActionsProps = DefaultProductPageTemplateProps & {
  /** Resolved `sledge.product.coming-soon-heading` (plain string). */
  comingSoonHeading: string;
  /** Resolved `sledge.product.coming-soon-body`; blank hides the line. */
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

export function SledgeProductActions({
  product,
  comingSoonHeading,
  comingSoonBody,
  onConfiguredPriceChange,
}: SledgeProductActionsProps) {
  const {
    inStock,
    variantOptions,
    handleAddToCartWith,
    displayPrice,
    displayCompareAtPrice,
    canAddMore,
    handleDecrement,
    handleIncrement,
    quantity,
    setSelectedVariantId,
    selectedVariantId,
    additionalFields,
    justAdded,
    cartEnabled,
  } = useProduct(product);

  const hasVariants = Object.keys(variantOptions).length > 0;

  // `SledgeVariantSelector` keeps its own quantity stepper (separate from
  // `useProduct`'s, which stays 1 for variant products) — mirror its value
  // here so `SubscribePanel` links to `/subscribe` with what the shopper
  // actually picked instead of always `qty=1`.
  const [variantQuantity, setVariantQuantity] = useState(1);
  const subscribeQuantity = hasVariants ? variantQuantity : quantity;

  // Product options (customizer). `product.customizer` is null when the
  // feature is off or the product has no groups — then none of this shows.
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
    <ProductCustomizer controller={customizer} className="sledge-customizer" />
  ) : null;

  const handleAddToCart = () => {
    if (customizerOn && !customizer.revealErrors()) return;
    handleAddToCartWith((item) =>
      customizerOn ? applyCustomizerToCartItem(item, customizer) : item,
    );
  };

  const stockQty = product.trackInventory ? (product.inventoryQty ?? 0) : null;
  const showStockCount = stockQty !== null && stockQty > 0 && inStock;

  // `sledge-subscribe-panel` (globals.css) scopes the shared token-only
  // panel to sledge's own coral/ink palette, since sledge doesn't remap the
  // shadcn tokens globally. `sl-btn` is sledge's own CTA class (used by
  // every other primary button in this template) so the Subscribe button
  // matches Add to Cart exactly.
  const subscribePanel = (
    <SubscribePanel
      product={product}
      selectedVariantId={selectedVariantId}
      quantity={subscribeQuantity}
      available={inStock}
      className="sledge-subscribe-panel mt-3"
      ctaClassName="sl-btn"
    />
  );

  if (additionalFields?.comingSoon) {
    return (
      <div className="rounded-sm border border-[var(--sl-border)] bg-[var(--sl-cream)] px-5 py-4">
        {comingSoonHeading.trim() ? (
          <p
            className="font-sans text-xs font-semibold tracking-[0.18em] text-[var(--sl-ink)] uppercase"
            {...fieldAttr("sledge.product.coming-soon-heading")}
          >
            {comingSoonHeading}
          </p>
        ) : null}
        {comingSoonBody.trim() ? (
          <p
            className={cn(
              "sl-eyebrow font-sans text-sm",
              comingSoonHeading.trim() && "mt-1.5",
            )}
            {...fieldAttr("sledge.product.coming-soon-body")}
          >
            {comingSoonBody}
          </p>
        ) : null}
      </div>
    );
  }

  if (hasVariants) {
    return (
      <>
        <SledgeVariantSelector
          product={product}
          setSelectedVariantId={setSelectedVariantId}
          onQuantityChange={setVariantQuantity}
          customizer={customizer}
          customizerSlot={customizerElement}
        />
        {subscribePanel}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* S-2: sr-only live region to announce add-to-cart */}
      <span className="sr-only" role="status">
        {justAdded ? `${product.name} added to cart` : ""}
      </span>

      {showStockCount && (
        <p className="sl-eyebrow font-sans text-xs tracking-[0.14em] text-[var(--sl-coral-aa)] uppercase">
          {stockQty} in stock
        </p>
      )}

      {product.trackInventory &&
        product.allowBackorders &&
        (product.inventoryQty ?? 0) === 0 && (
          <p className="sl-eyebrow font-sans text-xs tracking-[0.12em] uppercase">
            Backordered — ships when available
          </p>
        )}

      {inStock && customizerElement}

      {/* Catalog mode (B6.11): no qty or Add To Cart when `cart` is off */}
      {cartEnabled && inStock && canAddMore && (
        <div className="flex items-stretch gap-3">
          {/* S-3: group wrapper with accessible label */}
          <div
            role="group"
            aria-label="Quantity"
            className="flex items-center rounded-sm border border-[var(--sl-ink)]"
          >
            <button
              type="button"
              className="flex min-h-[46px] items-center justify-center px-3 transition-opacity hover:opacity-70"
              onClick={handleDecrement}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
            >
              <Minus className="size-3.5" />
            </button>
            {/* S-3: announce quantity changes */}
            <span
              aria-live="polite"
              className="min-w-[40px] text-center font-sans text-sm font-medium"
            >
              {quantity}
            </span>
            <button
              type="button"
              className="flex min-h-[46px] items-center justify-center px-3 transition-opacity hover:opacity-70"
              onClick={handleIncrement}
              aria-label="Increase quantity"
            >
              <Plus className="size-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            className={cn(
              "sl-btn flex-1",
              justAdded && "bg-[var(--sl-green)] text-[var(--sl-ink)]",
            )}
          >
            {justAdded ? (
              <>
                <Check className="size-4" />
                Added!
              </>
            ) : (
              "Add To Cart"
            )}
          </button>
        </div>
      )}

      {cartEnabled && inStock && !canAddMore && (
        <p className="sl-eyebrow font-sans text-xs tracking-[0.12em] text-[var(--sl-coral-aa)] uppercase">
          Maximum available quantity in cart
        </p>
      )}

      {/* S-8: use aria-disabled instead of disabled so it stays focusable */}
      {!inStock && (
        <>
          <button
            type="button"
            aria-disabled="true"
            onClick={() => {
              /* no-op: item is sold out */
            }}
            className="w-full cursor-not-allowed rounded-sm border border-[var(--sl-border-input)] py-3 font-sans text-xs tracking-[0.16em] text-[var(--sl-ink-soft)] uppercase"
          >
            Sold Out
          </button>
          <NotifyMeForm
            productId={product.id}
            className="mt-1"
            message="Get notified when it's back in stock."
            messageClassName="sl-eyebrow font-sans text-xs tracking-[0.12em] uppercase"
            inputClassName="rounded-sm border-[var(--sl-border-input)] font-sans"
            buttonClassName="rounded-sm border-[var(--sl-ink)] font-sans text-xs tracking-[0.16em] uppercase"
          />
        </>
      )}

      {subscribePanel}
    </div>
  );
}
