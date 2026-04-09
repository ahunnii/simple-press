"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { useCart } from "~/providers/cart-context";

type Props = {
  product: NonNullable<RouterOutputs["product"]["get"]>;
  setSelectedVariantId: (variantId: string | null) => void;
};

export function DarkTrendVariantSelector({
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
        <Label className="mb-3 block text-sm font-medium text-white">
          Select Variant
        </Label>
        <div className="flex flex-wrap gap-3">
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
              className={`rounded-md px-6 py-3 text-sm transition-colors ${
                selectedVariant?.id === variant.id
                  ? "bg-violet-500 text-white hover:bg-violet-600"
                  : "border border-white/60 bg-transparent text-white hover:bg-white/10"
              } ${variant.inventoryQty === 0 ? "cursor-not-allowed opacity-50" : ""}`}
            >
              {variant.name}
              {variant.inventoryQty === 0 && " (Out of Stock)"}
            </Button>
          ))}
        </div>
      </div>

      {/* Quantity Selection */}
      {selectedVariant && (
        <div className="mb-8">
          <Label className="mb-3 block text-sm font-medium text-white">
            Quantity
          </Label>
          <div className="inline-flex items-center gap-4 rounded-md bg-zinc-900/50 px-4 py-2">
            <Button
              variant="outline"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="flex h-10 w-10 items-center justify-center rounded-sm bg-zinc-800 text-white/60 transition-colors hover:text-white"
              aria-label="Decrease quantity"
            >
              -
            </Button>

            <span className="w-8 text-center font-medium text-white">
              {quantity}
            </span>

            <Button
              variant="outline"
              onClick={() =>
                setQuantity(
                  Math.min(selectedVariant.inventoryQty, quantity + 1),
                )
              }
              className="flex h-10 w-10 items-center justify-center rounded-sm bg-zinc-800 text-white/60 transition-colors hover:text-white"
              aria-label="Increase quantity"
            >
              +
            </Button>
            <span className="text-sm text-white/60">
              {selectedVariant.inventoryQty} available
            </span>
          </div>
        </div>
      )}

      {/* Add to Cart */}
      <div className="mb-10 flex flex-col gap-4 sm:flex-row">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!selectedVariant || selectedVariant.inventoryQty === 0}
          className={`inline-flex flex-1 items-center justify-center gap-2 rounded-md px-8 py-4 text-sm font-semibold tracking-wider text-white uppercase transition-all ${
            isAdded ? "bg-violet-600" : "bg-violet-500 hover:bg-violet-600"
          } ${!selectedVariant || selectedVariant.inventoryQty === 0 ? "cursor-not-allowed opacity-50" : ""}`}
        >
          {isAdded ? (
            <>
              <Check className="h-4 w-4" />
              Added to Cart
            </>
          ) : (
            `Add ${quantity} to Cart`
          )}
        </button>
      </div>
    </div>
  );
}
