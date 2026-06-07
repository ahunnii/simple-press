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

  const handleAddToCart = () => {
    if (!selectedVariant) return;
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
      <div>
        <p className="sl-eyebrow mb-3 font-sans text-xs tracking-[0.18em] uppercase">
          Select Variant
        </p>
        <div className="flex flex-wrap gap-2">
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
                onClick={() => {
                  setSelectedVariant(variant);
                  setSelectedVariantId(variant.id);
                }}
                disabled={outOfStock}
                className={cn(
                  "rounded-sm border px-4 py-2 font-sans text-xs tracking-[0.08em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40",
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
          <div className="flex items-center rounded-sm border border-[var(--sl-ink)]">
            <button
              type="button"
              className="flex min-h-[46px] items-center justify-center px-3 transition-opacity hover:opacity-70"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
            >
              <Minus className="size-3.5" />
            </button>
            <span className="min-w-[40px] text-center font-sans text-sm font-medium">
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

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={
            !selectedVariant ||
            (product.trackInventory &&
              (selectedVariant?.inventoryQty ?? 0) === 0 &&
              !product.allowBackorders)
          }
          className={cn(
            "sl-btn flex-1 disabled:cursor-not-allowed disabled:opacity-40",
            isAdded && "bg-[var(--sl-green)]",
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
