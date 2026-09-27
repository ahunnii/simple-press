"use client";

import { useEffect, useId, useState } from "react";

import type { RouterOutputs } from "~/trpc/react";
import { buildVariantCartItem } from "~/lib/products/build-variant-cart-item";
import { pickInitialVariant } from "~/lib/products/initial-variant";
import { cn } from "~/lib/utils";
import { useCart } from "~/providers/cart-context";
import { useVariantImage } from "~/app/(storefront)/_components/product-page/variant-image-context";
import { NotifyMeForm } from "~/app/(storefront)/_components/product/notify-me-form";

import {
  DREAM_NOTIFY_BUTTON_CLASSNAME,
  DREAM_NOTIFY_INPUT_CLASSNAME,
} from "./dream-product-styles";
import { DreamQuantityStepper } from "./dream-quantity-stepper";

const BACKORDER_MAX = 100;

type Props = {
  product: NonNullable<RouterOutputs["product"]["get"]>;
  setSelectedVariantId: (variantId: string | null) => void;
  /**
   * Notified whenever this selector's own `quantity` state changes, so the
   * parent's `SubscribePanel` (which has no stepper of its own) links to
   * `/subscribe` with the quantity the shopper actually chose.
   */
  onQuantityChange?: (quantity: number) => void;
  /**
   * Called after an item is added — dream's chrome has no cart icon or
   * drawer, so the parent shows an inline "Added to your cart · View cart"
   * confirmation instead.
   */
  onAdded?: () => void;
};

/**
 * Variant pills + quantity + add to cart for products with variants.
 * Mirrors `DefaultVariantSelector`'s cart/stock logic (it keeps its own
 * selected variant + quantity; the parent's `useProduct` is kept in sync via
 * `setSelectedVariantId` so the price above follows the choice), skinned in
 * dream tokens: ink pill when selected, paper pill with a hairline when not.
 */
export function DreamVariantSelector({
  product,
  setSelectedVariantId,
  onQuantityChange,
  onAdded,
}: Props) {
  const { addItem } = useCart();
  const { setVariantImageUrl } = useVariantImage();
  const labelId = useId();
  const stockId = useId();

  const [selectedVariant, setSelectedVariant] = useState(
    pickInitialVariant(product.variants, product),
  );
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setVariantImageUrl(selectedVariant?.imageUrl ?? null);
  }, [selectedVariant?.imageUrl, setVariantImageUrl]);

  useEffect(() => {
    onQuantityChange?.(quantity);
  }, [quantity, onQuantityChange]);

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

  const handleAddToCart = () => {
    if (!selectedVariant || addToCartDisabled) return;
    addItem(
      buildVariantCartItem(product, selectedVariant, effectiveMax),
      quantity,
    );
    setQuantity(1);
    onAdded?.();
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <p id={labelId} className="text-[15px] font-semibold">
          Choose an option
          {selectedVariant ? (
            <span className="font-normal text-[var(--dream-soft)]">
              {" "}
              · {selectedVariant.name}
            </span>
          ) : null}
        </p>
        <div
          role="group"
          aria-labelledby={labelId}
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
                  setSelectedVariant(variant);
                  setSelectedVariantId(variant.id);
                }}
                aria-disabled={outOfStock || undefined}
                aria-pressed={isSelected}
                aria-label={`${variant.name}${outOfStock ? ", sold out" : isBackorder ? ", pre-order" : ""}`}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-[var(--dream-radius-pill)] border px-5 text-[15px] font-medium transition-colors",
                  isSelected
                    ? "border-[var(--dream-ink)] bg-[var(--dream-ink)] text-[var(--dream-paper)]"
                    : "border-[var(--dream-line)] bg-[var(--dream-paper)] text-[var(--dream-ink)] hover:border-[var(--dream-gold)]",
                  outOfStock && "cursor-not-allowed line-through opacity-45",
                )}
              >
                {variant.name}
              </button>
            );
          })}
        </div>
      </div>

      {selectedVariant ? (
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <DreamQuantityStepper
              value={quantity}
              onDecrement={() => setQuantity(Math.max(1, quantity - 1))}
              onIncrement={() =>
                setQuantity(Math.min(effectiveMax, quantity + 1))
              }
              canDecrement={quantity > 1}
              canIncrement={quantity < effectiveMax}
              describedBy={product.trackInventory ? stockId : undefined}
            />
            <button
              type="button"
              onClick={handleAddToCart}
              aria-disabled={addToCartDisabled || undefined}
              className={cn(
                "dream-btn h-12 min-w-[12rem] flex-1",
                addToCartDisabled &&
                  "cursor-not-allowed opacity-50 hover:translate-y-0 hover:shadow-none",
              )}
            >
              {addToCartDisabled ? "Sold out" : "Add to cart"}
            </button>
          </div>

          {product.trackInventory ? (
            <p id={stockId} className="text-[14px] text-[var(--dream-soft)]">
              {isBackordered
                ? "Backordered — ships when available"
                : selectedVariant.inventoryQty > 0
                  ? `${selectedVariant.inventoryQty} available`
                  : "Sold out"}
            </p>
          ) : null}

          {addToCartDisabled ? (
            <NotifyMeForm
              productId={product.id}
              variantId={selectedVariant.id}
              className="mt-1"
              message="Get notified when this option is back in stock."
              messageClassName="text-[14px] text-[var(--dream-soft)]"
              inputClassName={DREAM_NOTIFY_INPUT_CLASSNAME}
              buttonClassName={DREAM_NOTIFY_BUTTON_CLASSNAME}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
