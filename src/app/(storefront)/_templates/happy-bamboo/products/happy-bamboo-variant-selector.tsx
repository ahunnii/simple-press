"use client";

import { useState } from "react";
import { Check, Minus, Plus } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { useCart } from "~/providers/cart-context";

type Props = {
  product: NonNullable<RouterOutputs["product"]["get"]>;
  setSelectedVariantId: (variantId: string | null) => void;
};

export function HappyBambooVariantSelector({
  product,
  setSelectedVariantId,
}: Props) {
  const { addItem } = useCart();
  const [selectedVariant, setSelectedVariant] = useState(
    product.variants[0] ?? null,
  );
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  const addToCartDisabled =
    !selectedVariant ||
    (product.trackInventory &&
      selectedVariant.inventoryQty === 0 &&
      !product.allowBackorders);

  const handleAddToCart = () => {
    if (addToCartDisabled) return;
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
      quantity, // ← Add specified quantity
    );

    // Reset quantity after adding
    setQuantity(1);

    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Variant Selection */}
      <div className="mb-6">
        <Label className="mb-3 block text-sm font-medium text-white">
          Select Variant
        </Label>
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
              <Button
                key={variant.id}
                variant={
                  selectedVariant?.id === variant.id ? "default" : "outline"
                }
                onClick={() => {
                  if (outOfStock) return;
                  setSelectedVariant(variant);
                  setSelectedVariantId(variant.id);
                }}
                aria-pressed={selectedVariant?.id === variant.id}
                aria-disabled={outOfStock}
                className={`bamboo-variant-btn ${
                  selectedVariant?.id === variant.id
                    ? "bamboo-variant-btn--selected"
                    : "bamboo-variant-btn--unselected"
                } ${outOfStock ? "bamboo-variant-btn--disabled aria-disabled:cursor-not-allowed aria-disabled:opacity-50" : ""}`}
              >
                {variant.name}
                {outOfStock && " (Out of Stock)"}
                {isBackorderVariant && " (Pre-order)"}
              </Button>
            );
          })}
        </div>
      </div>

      {selectedVariant && product.trackInventory && (
        <span role="status" aria-live="polite" className="text-sm">
          {selectedVariant?.inventoryQty ?? 0} available
        </span>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Quantity Selection */}
        {selectedVariant && (
          <div>
            <div className="border-border flex items-center gap-1 rounded-lg border">
              <Button
                variant="ghost"
                size="icon"
                className="size-10"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
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
                onClick={() =>
                  setQuantity(
                    product.trackInventory
                      ? Math.min(selectedVariant.inventoryQty, quantity + 1)
                      : quantity + 1,
                  )
                }
                aria-label="Increase quantity"
              >
                <Plus className="size-4" />
              </Button>
            </div>{" "}
          </div>
        )}

        {/* Add to Cart */}
        <Button
          type="button"
          onClick={handleAddToCart}
          aria-disabled={addToCartDisabled}
          className={`flex-1 ${addToCartDisabled ? "cursor-not-allowed opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50" : ""}`}
        >
          {isAdded ? (
            <>
              <Check className="h-4 w-4" aria-hidden="true" />
              Added to Cart
            </>
          ) : (
            `Add ${quantity} to Cart`
          )}
        </Button>
      </div>
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {isAdded ? "Added to cart" : ""}
      </span>
    </div>
  );
}
