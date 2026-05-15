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

export function DefaultVariantSelector({
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
    <div className="space-y-4">
      {/* Variant Selection */}
      <div>
        <Label>Select Variant</Label>
        <div className="grid-col-2 mt-2 grid gap-2 md:grid-cols-4">
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
                  setSelectedVariant(variant);
                  setSelectedVariantId(variant.id);
                }}
                disabled={outOfStock}
                className="rounded-full"
              >
                {variant.name}
                {outOfStock && " (Out of Stock)"}
                {isBackorderVariant && " (Pre-order)"}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Quantity + Add to Cart */}
      {selectedVariant && (
        <div className="flex flex-col gap-2">
          <Label>Quantity</Label>
          <div className="flex items-center gap-2">
            <div className="flex w-fit items-center rounded-md border">
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
              <span className="w-10 text-center text-base font-semibold">
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
                disabled={
                  product.trackInventory &&
                  !product.allowBackorders &&
                  quantity >= selectedVariant.inventoryQty
                }
                aria-label="Increase quantity"
              >
                <Plus className="size-4" />
              </Button>
            </div>
            {/* Stock count */}
            {selectedVariant && product.trackInventory && (
              <span className="text-sm text-gray-600">
                {selectedVariant.inventoryQty} available
              </span>
            )}
          </div>

          <Button
            type="button"
            onClick={handleAddToCart}
            disabled={
              !selectedVariant ||
              (product.trackInventory &&
                selectedVariant.inventoryQty === 0 &&
                !product.allowBackorders)
            }
            className="flex-1"
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
      )}
    </div>
  );
}
