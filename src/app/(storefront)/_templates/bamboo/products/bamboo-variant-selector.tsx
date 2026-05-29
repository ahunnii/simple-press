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

export function BambooVariantSelector({
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
        <Label className="mb-3 block text-sm font-medium" id="variant-label">
          Select Variant
        </Label>
        <div className="flex flex-wrap gap-3" role="group" aria-labelledby="variant-label">
          {product.variants.map((variant) => (
            <Button
              key={variant.id}
              variant={
                selectedVariant?.id === variant.id ? "default" : "outline"
              }
              onClick={() => {
                setSelectedVariant(variant);
                setSelectedVariantId(variant.id);
              }}
              disabled={variant.inventoryQty === 0}
              aria-pressed={selectedVariant?.id === variant.id}
              className={`bamboo-variant-btn ${
                selectedVariant?.id === variant.id
                  ? "bamboo-variant-btn--selected"
                  : "bamboo-variant-btn--unselected"
              } ${variant.inventoryQty === 0 ? "bamboo-variant-btn--disabled" : ""}`}
            >
              {variant.name}
              {variant.inventoryQty === 0 && " (Out of Stock)"}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Quantity Selection */}
        {selectedVariant && (
          <div>
            <Label className="mb-3 block text-sm font-medium">Quantity</Label>
            <div className="border-border flex items-center gap-1 rounded-lg border">
              <Button
                variant="ghost"
                size="icon"
                className="size-11"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
              >
                <Minus className="size-4" aria-hidden="true" />
              </Button>
              <span
                className="text-foreground w-10 text-center text-base font-semibold"
                aria-live="polite"
                aria-atomic="true"
                aria-label={`Quantity: ${quantity}`}
              >
                {quantity}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-11"
                onClick={() =>
                  setQuantity(
                    Math.min(selectedVariant.inventoryQty, quantity + 1),
                  )
                }
                aria-label="Increase quantity"
              >
                <Plus className="size-4" aria-hidden="true" />
              </Button>
            </div>{" "}
            {selectedVariant && (
              <span className="text-sm">
                {selectedVariant?.inventoryQty ?? 0} available
              </span>
            )}
          </div>
        )}

        {/* Add to Cart */}
        <Button
          type="button"
          onClick={handleAddToCart}
          disabled={!selectedVariant || selectedVariant.inventoryQty === 0}
          className={`flex-1 ${!selectedVariant || selectedVariant.inventoryQty === 0 ? "cursor-not-allowed opacity-50" : ""}`}
        >
          {isAdded ? (
            <>
              <Check className="h-4 w-4" />
              Added to Cart
            </>
          ) : (
            `Add ${quantity} to Cart`
          )}
        </Button>
      </div>
    </div>
  );
}
