"use client";

import { useState } from "react";
import { Check, Minus, Plus } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { useCart } from "~/providers/cart-context";

type Props = {
  product: NonNullable<RouterOutputs["product"]["get"]>;
  setSelectedVariantId: (variantId: string | null) => void;
};

export function NoiseVariantSelector({ product, setSelectedVariantId }: Props) {
  const { addItem } = useCart();
  const [selectedVariant, setSelectedVariant] = useState(
    product.variants[0] ?? null,
  );
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

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
      {
        productId: product.id,
        variantId: selectedVariant.id,
        productName: product.name,
        variantName: selectedVariant.name,
        price: selectedVariant.price ?? product.price,
        imageUrl: product.images[0]?.url ?? null,
        sku: selectedVariant.sku,
        maxInventory: product.trackInventory
          ? selectedVariant.inventoryQty
          : undefined,
      },
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
          {selectedVariant.inventoryQty ?? 0} in stock
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        {selectedVariant && (
          // S-3: wrap stepper in group with label
          <div role="group" aria-label="Quantity" className="flex items-center rounded-sm border border-[var(--sl-ink)]">
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
            <span aria-live="polite" className="min-w-[40px] text-center font-sans text-sm font-medium">
              {quantity}
            </span>
            <button
              type="button"
              className="flex min-h-[46px] items-center justify-center px-3 transition-opacity hover:opacity-70"
              onClick={() =>
                setQuantity(
                  product.trackInventory
                    ? Math.min(selectedVariant.inventoryQty, quantity + 1)
                    : quantity + 1,
                )
              }
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
            `Add ${quantity} to Cart`
          )}
        </button>
      </div>
    </div>
  );
}
