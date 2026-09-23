"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { formatPrice } from "~/lib/prices";
import { buildVariantCartItem } from "~/lib/products/build-variant-cart-item";
import { cn } from "~/lib/utils";
import { useCart } from "~/providers/cart-context";
import { useVariantImage } from "~/app/(storefront)/_components/product-page/variant-image-context";
import { NotifyMeForm } from "~/app/(storefront)/_components/product/notify-me-form";

type Props = {
  product: NonNullable<RouterOutputs["product"]["get"]>;
  selectedVariantId: string | null;
  setSelectedVariantId: (variantId: string | null) => void;
  /** Wishlist heart, rendered next to the Add to Cart pill. */
  wishlistSlot?: ReactNode;
  /**
   * Notified whenever this selector's own `quantity` state changes, so a
   * parent that renders `SubscribePanel` below it (which has no stepper of
   * its own) can link to `/subscribe` with the quantity the shopper actually
   * chose instead of always `1`.
   */
  onQuantityChange?: (quantity: number) => void;
};

/**
 * UmscVariantSelector — modelled on `vii-variant-selector.tsx`, restyled to
 * umsc: gold-ink selected pill, quantity stepper, gold "Add to cart · $price"
 * pill (full width on mobile per design.md), `NotifyMeForm` when the
 * selected variant is out of stock and backorders are off.
 */
export function UmscVariantSelector({
  product,
  selectedVariantId,
  setSelectedVariantId,
  wishlistSlot,
  onQuantityChange,
}: Props) {
  const { addItem } = useCart();
  const { setVariantImageUrl } = useVariantImage();

  const selectedVariant =
    product.variants.find((v) => v.id === selectedVariantId) ??
    product.variants[0] ??
    null;
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    setVariantImageUrl(selectedVariant?.imageUrl ?? null);
  }, [selectedVariant?.imageUrl, setVariantImageUrl]);

  useEffect(() => {
    onQuantityChange?.(quantity);
  }, [quantity, onQuantityChange]);

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

  const addToCartDisabled =
    !selectedVariant ||
    (product.trackInventory &&
      selectedVariant.inventoryQty === 0 &&
      !product.allowBackorders);

  const unitPrice = selectedVariant?.price ?? product.price;

  const handleAddToCart = () => {
    if (!selectedVariant || addToCartDisabled) return;
    addItem(
      buildVariantCartItem(product, selectedVariant, effectiveMax),
      quantity,
    );
    setQuantity(1);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 900);
  };

  return (
    <div className="flex flex-col gap-5">
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {isAdded ? "Added to cart" : ""}
      </span>

      {/* Variant pills */}
      <div className="flex flex-col gap-2.5">
        <span
          id="umsc-variant-label"
          aria-live="polite"
          className="umsc-sans text-[11px] font-semibold tracking-[0.14em] text-[var(--umsc-muted)] uppercase"
        >
          Select option
          {selectedVariant && (
            <span className="ml-2 font-medium tracking-normal text-[var(--umsc-ink)] normal-case">
              — {selectedVariant.name}
            </span>
          )}
        </span>
        <div
          role="group"
          aria-labelledby="umsc-variant-label"
          className="flex flex-wrap gap-2"
        >
          {product.variants.map((variant) => {
            const outOfStock =
              product.trackInventory &&
              variant.inventoryQty === 0 &&
              !product.allowBackorders;
            const isBackorder =
              product.trackInventory &&
              variant.inventoryQty === 0 &&
              !!product.allowBackorders;
            const isSelected = selectedVariant?.id === variant.id;

            return (
              <button
                key={variant.id}
                type="button"
                onClick={() => {
                  if (outOfStock) return;
                  setSelectedVariantId(variant.id);
                }}
                aria-disabled={outOfStock || undefined}
                aria-pressed={isSelected}
                aria-label={`${variant.name}${outOfStock ? ", sold out" : isBackorder ? ", pre-order" : ""}`}
                className={cn(
                  "umsc-sans inline-flex h-11 min-w-[52px] items-center border px-4 text-[14px] transition-colors",
                  isSelected
                    ? "border-[var(--umsc-ink)] bg-[var(--umsc-ink)] text-[var(--umsc-paper)]"
                    : "border-[var(--umsc-line)] bg-transparent text-[var(--umsc-ink)] hover:border-[var(--umsc-ink)]",
                  outOfStock && "cursor-not-allowed opacity-40",
                )}
              >
                {variant.name}
                {isBackorder && !isSelected && (
                  <span
                    aria-hidden="true"
                    className="ml-1.5 text-[10px] text-[var(--umsc-muted)]"
                  >
                    (pre-order)
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Qty + Add to cart + wishlist */}
      {selectedVariant && (
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <div
              role="group"
              aria-label="Quantity"
              className="inline-flex h-12 w-[130px] shrink-0 items-center border border-[var(--umsc-line)]"
            >
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
                className="flex h-full flex-1 items-center justify-center text-[18px] font-light text-[var(--umsc-ink)] disabled:opacity-30"
              >
                <span aria-hidden="true">−</span>
              </button>
              <span
                aria-live="polite"
                aria-atomic="true"
                className="umsc-tabular umsc-sans w-10 text-center text-[14px] font-medium text-[var(--umsc-ink)]"
              >
                {quantity}
              </span>
              <button
                type="button"
                onClick={() =>
                  setQuantity(Math.min(effectiveMax, quantity + 1))
                }
                disabled={quantity >= effectiveMax}
                aria-label="Increase quantity"
                className="flex h-full flex-1 items-center justify-center text-[18px] font-light text-[var(--umsc-ink)] disabled:opacity-30"
              >
                <span aria-hidden="true">+</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              aria-disabled={addToCartDisabled || undefined}
              className={cn(
                "umsc-btn umsc-btn-gold h-12 min-w-0 flex-1 basis-full sm:basis-auto",
                addToCartDisabled && "cursor-not-allowed opacity-50",
              )}
            >
              {isAdded ? (
                <>
                  <Check className="size-4" aria-hidden="true" />
                  Added
                </>
              ) : (
                <>Add to cart · {formatPrice(unitPrice)}</>
              )}
            </button>

            {wishlistSlot}
          </div>

          {product.trackInventory && (
            <p className="umsc-sans text-[12px] text-[var(--umsc-muted)]">
              {isBackordered
                ? "Pre-order — ships when available"
                : selectedVariant.inventoryQty > 0
                  ? `${selectedVariant.inventoryQty} available`
                  : null}
            </p>
          )}

          {addToCartDisabled && (
            <NotifyMeForm
              productId={product.id}
              variantId={selectedVariant.id}
              message="Get notified when this option is back in stock."
              messageClassName="text-sm text-[var(--umsc-muted)]"
              inputClassName="border-[var(--umsc-line)] text-[var(--umsc-ink)]"
              buttonClassName="border-[var(--umsc-ink)] text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--umsc-ink)]"
            />
          )}
        </div>
      )}
    </div>
  );
}
