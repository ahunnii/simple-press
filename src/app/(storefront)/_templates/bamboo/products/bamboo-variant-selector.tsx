"use client";

import { useEffect, useState } from "react";
import { Check, Minus, Plus } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { buildVariantCartItem } from "~/lib/products/build-variant-cart-item";
import { pickInitialVariant } from "~/lib/products/initial-variant";
import { useCart } from "~/providers/cart-context";
import { useVariantImage } from "~/app/(storefront)/_components/product-page/variant-image-context";
import { NotifyMeForm } from "~/app/(storefront)/_components/product/notify-me-form";

type Props = {
  product: NonNullable<RouterOutputs["product"]["get"]>;
  setSelectedVariantId: (variantId: string | null) => void;
};

/**
 * Variant picker, presented as `.bamboo-pill-radio` pills over a real native
 * `<fieldset>`/radiogroup (mockup: `.opts`/`.pills`/`.pill`/`.pill-face`,
 * mockup-b-product.elided.html lines ~1061-1076) — NEVER the shared
 * `.bamboo-variant-btn` class, which is byte-identical with `.happy-bamboo`
 * and must stay untouched. `.bamboo-pill-radio`'s checked/disabled look is
 * keyed off `data-state`/`data-disabled` (the Radix RadioGroup convention);
 * these are native `<input type="radio">`s instead, so those attributes are
 * set by hand from React state.
 *
 * Wiring is unchanged: this component still owns its own
 * `selectedVariant`/`quantity`/`isAdded` state and calls `useCart().addItem`
 * directly via `buildVariantCartItem` — restyle only.
 */
export function BambooVariantSelector({
  product,
  setSelectedVariantId,
}: Props) {
  const { addItem } = useCart();
  const { setVariantImageUrl } = useVariantImage();

  const [selectedVariant, setSelectedVariant] = useState(
    pickInitialVariant(product.variants, product),
  );
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    setVariantImageUrl(selectedVariant?.imageUrl ?? null);
  }, [selectedVariant?.imageUrl, setVariantImageUrl]);

  const BACKORDER_MAX = 100;
  const isBackordered =
    product.trackInventory &&
    !!product.allowBackorders &&
    (selectedVariant?.inventoryQty ?? 0) === 0;
  const effectiveMax = !product.trackInventory
    ? BACKORDER_MAX
    : (selectedVariant?.inventoryQty ?? 0) > 0
      ? (selectedVariant?.inventoryQty ?? 0)
      : product.allowBackorders
        ? BACKORDER_MAX
        : 0;

  const disabledVariantNames = product.variants
    .filter(
      (variant) =>
        product.trackInventory &&
        variant.inventoryQty === 0 &&
        !product.allowBackorders,
    )
    .map((variant) => variant.name);

  const handleAddToCart = () => {
    if (!selectedVariant) return;

    addItem(
      buildVariantCartItem(product, selectedVariant, effectiveMax),
      quantity, // ← Add specified quantity
    );

    // Reset quantity after adding
    setQuantity(1);

    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Variant selection — real radiogroup via a native fieldset */}
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="font-heading p-0 text-[1.02rem] font-semibold text-[var(--bamboo-pine)]">
          Select Variant
        </legend>
        <div className="mt-3.5 flex flex-wrap gap-3">
          {product.variants.map((variant) => {
            const isOutOfStock =
              product.trackInventory &&
              variant.inventoryQty === 0 &&
              !product.allowBackorders;
            const isBackorderVariant =
              product.trackInventory &&
              variant.inventoryQty === 0 &&
              !!product.allowBackorders;
            const isChecked = selectedVariant?.id === variant.id;
            return (
              <label
                key={variant.id}
                className="bamboo-pill-radio relative inline-flex"
                data-state={isChecked ? "checked" : "unchecked"}
                data-disabled={isOutOfStock ? "true" : undefined}
              >
                <input
                  type="radio"
                  name={`bamboo-variant-${product.id}`}
                  value={variant.id}
                  checked={isChecked}
                  disabled={isOutOfStock}
                  onChange={() => {
                    if (isOutOfStock) return;
                    setSelectedVariant(variant);
                    setSelectedVariantId(variant.id);
                  }}
                  className="absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                />
                {variant.name}
                {isOutOfStock && " (Out of Stock)"}
                {isBackorderVariant && " (Pre-order)"}
              </label>
            );
          })}
        </div>
        {disabledVariantNames.length > 0 && (
          <p className="mt-2.5 text-[0.86rem] text-[var(--bamboo-muted)]">
            {disabledVariantNames.join(", ")}{" "}
            {disabledVariantNames.length === 1 ? "is" : "are"} out of stock —{" "}
            {disabledVariantNames.length === 1 ? "it" : "they"} can&apos;t be
            selected.
          </p>
        )}
      </fieldset>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Quantity Selection */}
        {selectedVariant && (
          <div className="bamboo-qty-stepper">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
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
              onClick={() => setQuantity(Math.min(effectiveMax, quantity + 1))}
              disabled={quantity >= effectiveMax}
              aria-label="Increase quantity"
            >
              <Plus className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Add to Cart */}
        {(() => {
          const isUnavailable =
            !selectedVariant ||
            (product.trackInventory &&
              selectedVariant.inventoryQty === 0 &&
              !product.allowBackorders);
          return (
            <button
              type="button"
              onClick={() => {
                if (isUnavailable) return;
                handleAddToCart();
              }}
              disabled={isUnavailable}
              className="bamboo-btn bamboo-btn-primary flex-1 justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
            >
              {isAdded ? (
                <>
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Added to Cart
                </>
              ) : (
                `Add ${quantity} to Cart`
              )}
            </button>
          );
        })()}
        {/* S-1: live region announces add-to-cart confirmation */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {isAdded && selectedVariant
            ? `${product.name} — ${selectedVariant.name} added to cart`
            : ""}
        </div>
      </div>
      {selectedVariant && product.trackInventory && (
        <p className="mt-2 text-[0.86rem] text-[var(--bamboo-ink-soft)]">
          {isBackordered
            ? "Backordered — ships when available"
            : `${selectedVariant?.inventoryQty ?? 0} available`}
        </p>
      )}

      {/* Notify me when the selected variant is back in stock */}
      {selectedVariant && effectiveMax === 0 && (
        <NotifyMeForm
          productId={product.id}
          variantId={selectedVariant.id}
          message="Get notified when this option is back in stock."
          messageClassName="text-[var(--bamboo-ink-soft)] text-sm"
          inputClassName="rounded-full border-2 border-[var(--bamboo-outline)] bg-[var(--bamboo-roll)] focus-visible:border-[var(--bamboo-pine)]"
          buttonClassName="bamboo-btn bamboo-btn-primary"
        />
      )}
    </div>
  );
}
