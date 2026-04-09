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

export function PollenVariantSelector({ product, setSelectedVariantId }: Props) {
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
    <div className="space-y-4">
      <div className="mb-6">
        <Label className="mb-3 block text-sm font-semibold uppercase tracking-wide text-[#2a351f]">
          Select Variant
        </Label>
        <div className="flex flex-wrap gap-2">
          {product.variants.map((variant) => (
            <button
              key={variant.id}
              type="button"
              onClick={() => {
                setSelectedVariant(variant);
                setSelectedVariantId(variant.id);
              }}
              disabled={variant.inventoryQty === 0}
              className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                selectedVariant?.id === variant.id
                  ? "border-[#215935] bg-[#215935] text-white"
                  : "border-[#2a351f]/20 text-[#2a351f] hover:border-[#215935] hover:text-[#215935]"
              } ${variant.inventoryQty === 0 ? "cursor-not-allowed opacity-50" : ""}`}
            >
              {variant.name}
              {variant.inventoryQty === 0 && " (Out of Stock)"}
            </button>
          ))}
        </div>
      </div>

      {selectedVariant && (
        <p className="text-sm text-[#4c566a]">
          {selectedVariant.inventoryQty} available
        </p>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {selectedVariant && (
          <div className="flex items-center gap-1 rounded-md border border-[#2a351f]/20">
            <Button
              variant="ghost"
              size="icon"
              className="size-10 text-[#2a351f] hover:bg-[#2a351f]/5"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
            >
              <Minus className="size-4" />
            </Button>
            <span className="w-10 text-center text-base font-semibold text-[#2a351f]">
              {quantity}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-10 text-[#2a351f] hover:bg-[#2a351f]/5"
              onClick={() =>
                setQuantity(Math.min(selectedVariant.inventoryQty, quantity + 1))
              }
              aria-label="Increase quantity"
            >
              <Plus className="size-4" />
            </Button>
          </div>
        )}

        <Button
          type="button"
          onClick={handleAddToCart}
          disabled={!selectedVariant || selectedVariant.inventoryQty === 0}
          className="flex-1 bg-[#215935] text-white hover:bg-[#1a4729] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isAdded ? (
            <>
              <Check className="mr-2 h-4 w-4" />
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
