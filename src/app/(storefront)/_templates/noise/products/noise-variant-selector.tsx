"use client";

import { useState } from "react";
import { Check, Minus, Plus } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { Button } from "~/components/ui/button";
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
      {/* Variant Selection */}
      <div>
        <p className="text-muted-foreground mb-3 font-sans text-[9px] tracking-[0.3em] uppercase">
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

            return (
              <button
                key={variant.id}
                type="button"
                aria-pressed={selectedVariant?.id === variant.id}
                aria-disabled={outOfStock ? "true" : undefined}
                onClick={() => {
                  if (outOfStock) return;
                  setSelectedVariant(variant);
                  setSelectedVariantId(variant.id);
                }}
                className={`border px-4 py-2 font-sans text-xs tracking-wider transition-colors ${
                  outOfStock ? "cursor-not-allowed opacity-40" : ""
                } ${
                  selectedVariant?.id === variant.id
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-foreground hover:border-foreground bg-transparent"
                }`}
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
        <p className="text-muted-foreground font-sans text-xs">
          {selectedVariant.inventoryQty ?? 0} in stock
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Quantity */}
        {selectedVariant && (
          <div className="border-border flex items-center border">
            <Button
              variant="ghost"
              size="icon"
              className="size-10 rounded-none"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
            >
              <Minus className="size-3.5" aria-hidden="true" />
            </Button>
            <span
              className="text-foreground w-10 text-center font-sans text-sm font-medium"
              aria-live="polite"
              aria-atomic="true"
            >
              {quantity}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-10 rounded-none"
              onClick={() =>
                setQuantity(
                  product.trackInventory
                    ? Math.min(selectedVariant.inventoryQty, quantity + 1)
                    : quantity + 1,
                )
              }
              aria-label="Increase quantity"
            >
              <Plus className="size-3.5" aria-hidden="true" />
            </Button>
          </div>
        )}

        {/* Add to Cart */}
        {(() => {
          const isUnavailable =
            !selectedVariant ||
            (product.trackInventory &&
              (selectedVariant?.inventoryQty ?? 0) === 0 &&
              !product.allowBackorders);
          return (
            <Button
              type="button"
              aria-disabled={isUnavailable ? "true" : undefined}
              onClick={() => {
                if (isUnavailable) return;
                handleAddToCart();
              }}
              className={`flex-1 rounded-none font-sans text-[10px] tracking-[0.25em] uppercase ${isUnavailable ? "cursor-not-allowed opacity-50" : ""}`}
              size="lg"
            >
              {isAdded ? (
                <>
                  <Check className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                  Added
                </>
              ) : (
                `Add ${quantity} to Cart`
              )}
            </Button>
          );
        })()}
      </div>
      {/* S-2: live region for add-to-cart announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {isAdded && selectedVariant
          ? `${product.name} — ${selectedVariant.name} added to bag`
          : ""}
      </div>
    </div>
  );
}
