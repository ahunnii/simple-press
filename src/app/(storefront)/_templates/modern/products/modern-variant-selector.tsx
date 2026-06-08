"use client";

import { useState } from "react";
import { Check, Minus, Plus } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { useCart } from "~/providers/cart-context";

type Props = {
  product: NonNullable<RouterOutputs["product"]["get"]>;
  setSelectedVariantId: (variantId: string | null) => void;
};

export function ModernVariantSelector({
  product,
  setSelectedVariantId,
}: Props) {
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
        maxInventory: selectedVariant.inventoryQty,
      },
      quantity,
    );

    setQuantity(1);

    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Variant Selection */}
      <div role="group" aria-label="Select variant">
        <span className="text-foreground mb-3 block text-xs font-semibold tracking-widest uppercase">
          Select Variant
        </span>
        <div className="flex flex-wrap gap-3">
          {product.variants.map((variant) => {
            const outOfStock =
              product.trackInventory &&
              variant.inventoryQty === 0 &&
              !product.allowBackorders;
            const isBackorderVariant =
              product.trackInventory &&
              variant.inventoryQty === 0 &&
              !!product.allowBackorders;

            return (
              <button
                key={variant.id}
                type="button"
                onClick={() => {
                  if (outOfStock) return;
                  setSelectedVariant(variant);
                  setSelectedVariantId(variant.id);
                }}
                aria-pressed={selectedVariant?.id === variant.id}
                aria-disabled={outOfStock ? "true" : undefined}
                className={`rounded-sm border px-6 py-3 text-sm transition-colors ${
                  selectedVariant?.id === variant.id
                    ? "bg-primary text-primary-foreground hover:opacity-90"
                    : "border-border text-foreground hover:bg-muted"
                } ${outOfStock ? "cursor-not-allowed opacity-50" : ""}`}
              >
                {variant.name}
                {outOfStock && " (Out of Stock)"}
                {isBackorderVariant && " (Pre-order)"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quantity Selection */}
      {selectedVariant && selectedVariant.inventoryQty > 0 && (
        <div role="group" aria-label="Quantity">
          <span className="text-foreground mb-3 block text-xs font-semibold tracking-widest uppercase">
            Quantity
          </span>
          <div className="border-border flex w-fit items-center border">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="text-foreground hover:bg-muted flex h-10 w-10 items-center justify-center transition-colors disabled:opacity-50"
              aria-label="Decrease quantity"
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
            </button>
            <span
              aria-live="polite"
              aria-atomic="true"
              className="border-border text-foreground flex h-10 w-24 items-center justify-center border-x text-sm font-medium"
            >
              {quantity}
            </span>
            <button
              type="button"
              onClick={() =>
                setQuantity(
                  product.trackInventory
                    ? Math.min(selectedVariant.inventoryQty, quantity + 1)
                    : quantity + 1,
                )
              }
              disabled={quantity >= selectedVariant.inventoryQty}
              className="text-foreground hover:bg-muted flex h-10 w-10 items-center justify-center transition-colors disabled:opacity-50"
              aria-label="Increase quantity"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <p className="text-muted-foreground mt-2 text-sm">
            {selectedVariant.inventoryQty} available
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={
            !selectedVariant ||
            (product.trackInventory &&
              selectedVariant.inventoryQty === 0 &&
              !product.allowBackorders)
          }
          className={`bg-primary text-primary-foreground flex flex-1 items-center justify-center gap-2 px-8 py-3 text-sm font-medium tracking-wide transition-opacity disabled:cursor-not-allowed disabled:opacity-50 ${
            !isAdded && "hover:opacity-90"
          }`}
        >
          {isAdded ? (
            <>
              <Check className="h-4 w-4" aria-hidden="true" />
              Added to Cart
            </>
          ) : (
            `Add ${quantity > 1 ? quantity : ""} to Cart`.trim()
          )}
        </button>
      </div>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {isAdded ? `${product.name} added to cart` : ""}
      </span>
    </div>
  );
}
