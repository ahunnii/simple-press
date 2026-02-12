"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useCart } from "~/providers/cart-context";

type VariantSelectorProps = {
  // product: {
  //   id: string;
  //   name: string;
  //   price: number;
  //   images: Array<{ url: string }>;
  //   variants: Array<{
  //     id: string;
  //     name: string;
  //     price: number | null;
  //     inventoryQty: number;
  //     sku: string | null;
  //     options: Record<string, string>;
  //   }>;
  // };
  product: NonNullable<RouterOutputs["product"]["get"]>;
  selectedVariantId: string | null;
  setSelectedVariantId: (variantId: string | null) => void;
};

export function ElegantVariantSelector({
  product,
  selectedVariantId,
  setSelectedVariantId,
}: VariantSelectorProps) {
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
        <Label className="text-foreground mb-3 block text-sm font-medium">
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
              className={`boty-transition boty-shadow rounded-full px-6 py-3 text-sm ${
                selectedVariant?.id === variant.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-foreground hover:bg-card/80"
              }`}
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
          <Label className="text-foreground mb-3 block text-sm font-medium">
            Quantity
          </Label>
          <div className="bg-card boty-shadow inline-flex items-center gap-4 rounded-full px-2 py-2">
            <Button
              variant="outline"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="bg-background text-foreground/60 hover:text-foreground boty-transition flex h-10 w-10 items-center justify-center rounded-full"
              aria-label="Decrease quantity"
            >
              -
            </Button>

            <span className="text-foreground w-8 text-center font-medium">
              {quantity}
            </span>

            {/* <Input
              type="number"
              min="1"
              max={selectedVariant.inventoryQty}
              value={quantity}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val)) {
                  setQuantity(
                    Math.min(selectedVariant.inventoryQty, Math.max(1, val)),
                  );
                }
              }}
              className="w-20 rounded border px-2 py-1 text-center"
            /> */}
            <Button
              variant="outline"
              onClick={() =>
                setQuantity(
                  Math.min(selectedVariant.inventoryQty, quantity + 1),
                )
              }
              className="bg-background text-foreground/60 hover:text-foreground boty-transition flex h-10 w-10 items-center justify-center rounded-full"
              aria-label="Increase quantity"
            >
              +
            </Button>
            <span className="text-sm text-gray-600">
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
          className={`boty-transition boty-shadow inline-flex flex-1 items-center justify-center gap-2 rounded-full px-8 py-4 text-sm tracking-wide ${
            isAdded
              ? "bg-primary/80 text-primary-foreground"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
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
        {/* <button
          type="button"
          className="border-foreground/20 text-foreground boty-transition hover:bg-foreground/5 inline-flex flex-1 items-center justify-center gap-2 rounded-full border bg-transparent px-8 py-4 text-sm tracking-wide"
        >
          Buy Now
        </button> */}
      </div>

      {/* <Button
        onClick={handleAddToCart}
        disabled={!selectedVariant || selectedVariant.inventoryQty === 0}
        className="w-full"
      >
        Add {quantity} to Cart
      </Button> */}
    </div>
  );
}
