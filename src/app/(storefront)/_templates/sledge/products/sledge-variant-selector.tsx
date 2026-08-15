"use client";

import { useEffect, useState } from "react";
import { Check, Minus, Plus } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { buildVariantCartItem } from "~/lib/products/build-variant-cart-item";
import { pickInitialVariant } from "~/lib/products/initial-variant";
import { cn } from "~/lib/utils";
import { useCart } from "~/providers/cart-context";
import { useVariantImage } from "~/app/(storefront)/_components/product-page/variant-image-context";
import { NotifyMeForm } from "~/app/(storefront)/_components/product/notify-me-form";

type Props = {
  product: NonNullable<RouterOutputs["product"]["get"]>;
  setSelectedVariantId: (variantId: string | null) => void;
};

export function SledgeVariantSelector({
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

  const isAddDisabled =
    !selectedVariant ||
    (product.trackInventory &&
      (selectedVariant?.inventoryQty ?? 0) === 0 &&
      !product.allowBackorders);

  const handleAddToCart = () => {
    if (!selectedVariant) return;
    // S-8: guard out-of-stock condition
    if (
      product.trackInventory &&
      selectedVariant.inventoryQty === 0 &&
      !product.allowBackorders
    )
      return;
    addItem(
      buildVariantCartItem(product, selectedVariant, effectiveMax),
      quantity,
    );
    setQuantity(1);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* S-2: sr-only live region for add-to-cart announcement */}
      <span className="sr-only" role="status">
        {isAdded && selectedVariant
          ? `Added ${quantity} ${selectedVariant.name} to cart`
          : ""}
      </span>

      <div>
        <p
          id="sledge-variant-label"
          className="sl-eyebrow mb-3 font-sans text-xs tracking-[0.18em] uppercase"
        >
          Select Variant
        </p>
        {/* S-8 / variant group: wrap in group with aria-labelledby */}
        <div
          role="group"
          aria-labelledby="sledge-variant-label"
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
                aria-pressed={isSelected}
                // S-8: use aria-disabled instead of disabled so it stays focusable
                aria-disabled={outOfStock ? "true" : undefined}
                onClick={() => {
                  if (outOfStock) return;
                  setSelectedVariant(variant);
                  setSelectedVariantId(variant.id);
                }}
                className={cn(
                  "rounded-sm border px-4 py-2 font-sans text-xs tracking-[0.08em] uppercase transition-colors",
                  outOfStock && "cursor-not-allowed opacity-60",
                  isSelected
                    ? "border-[var(--sl-ink)] bg-[var(--sl-ink)] text-white"
                    : "border-[var(--sl-border-input)] bg-white text-[var(--sl-ink)] hover:border-[var(--sl-ink)]",
                )}
              >
                {variant.name}
                {outOfStock && " (Out of Stock)"}
                {isBackorder && " (Pre-order)"}
              </button>
            );
          })}
        </div>
      </div>

      {selectedVariant && product.trackInventory && (
        <p className="sl-eyebrow font-sans text-xs tracking-[0.12em] uppercase">
          {isBackordered
            ? "Backordered — ships when available"
            : `${selectedVariant.inventoryQty ?? 0} in stock`}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        {selectedVariant && (
          // S-3: wrap stepper in group with label
          <div
            role="group"
            aria-label="Quantity"
            className="flex items-center rounded-sm border border-[var(--sl-ink)]"
          >
            <button
              type="button"
              className="flex min-h-[46px] items-center justify-center px-3 transition-opacity hover:opacity-70"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
            >
              <Minus className="size-3.5" />
            </button>
            {/* S-3: announce quantity updates */}
            <span
              aria-live="polite"
              className="min-w-[40px] text-center font-sans text-sm font-medium"
            >
              {quantity}
            </span>
            <button
              type="button"
              className="flex min-h-[46px] items-center justify-center px-3 transition-opacity hover:opacity-70 disabled:opacity-40"
              onClick={() => setQuantity(Math.min(effectiveMax, quantity + 1))}
              disabled={quantity >= effectiveMax}
              aria-label="Increase quantity"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
        )}

        {/* S-8: aria-disabled instead of disabled for add button */}
        <button
          type="button"
          onClick={handleAddToCart}
          aria-disabled={isAddDisabled ? "true" : undefined}
          className={cn(
            "sl-btn flex-1",
            isAddDisabled && "cursor-not-allowed opacity-60",
            isAdded && "bg-[var(--sl-green)] text-[var(--sl-ink)]",
          )}
        >
          {isAdded ? (
            <>
              <Check className="size-4" />
              Added!
            </>
          ) : (
            `Add ${quantity > 1 ? `${quantity} ` : ""}to Cart`
          )}
        </button>
      </div>

      {/* Notify me when the selected variant is back in stock */}
      {selectedVariant && isAddDisabled && (
        <NotifyMeForm
          productId={product.id}
          variantId={selectedVariant.id}
          message="Get notified when this option is back in stock."
          messageClassName="sl-eyebrow font-sans text-xs tracking-[0.12em] uppercase"
          inputClassName="rounded-sm border-[var(--sl-border-input)] font-sans"
          buttonClassName="rounded-sm border-[var(--sl-ink)] font-sans text-xs tracking-[0.16em] uppercase"
        />
      )}
    </div>
  );
}
