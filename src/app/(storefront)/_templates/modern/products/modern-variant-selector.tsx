"use client";

import { useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
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

  const handleBuyNow = () => {
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

    router.push("/checkout");
  };

  return (
    <div className="space-y-6">
      {/* Variant Selection */}
      <div>
        <label className="text-foreground mb-3 block text-xs font-semibold tracking-widest uppercase">
          Select Variant
        </label>
        <div className="flex flex-wrap gap-3">
          {product.variants.map((variant) => (
            <button
              key={variant.id}
              type="button"
              onClick={() => {
                setSelectedVariant(variant);
                setSelectedVariantId(variant.id);
              }}
              disabled={variant.inventoryQty === 0}
              className={`rounded-sm border px-6 py-3 text-sm transition-colors ${
                selectedVariant?.id === variant.id
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "border-border text-foreground hover:bg-muted"
              } ${variant.inventoryQty === 0 ? "cursor-not-allowed opacity-50" : ""}`}
            >
              {variant.name}
              {variant.inventoryQty === 0 && " (Out of Stock)"}
            </button>
          ))}
        </div>
      </div>

      {/* Quantity Selection */}
      {selectedVariant && selectedVariant.inventoryQty > 0 && (
        <div>
          <label className="text-foreground mb-3 block text-xs font-semibold tracking-widest uppercase">
            Quantity
          </label>
          <div className="border-border flex items-center border">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="text-foreground hover:bg-muted flex h-10 w-10 items-center justify-center transition-colors disabled:opacity-50"
              aria-label="Decrease quantity"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="border-border text-foreground flex h-10 w-12 items-center justify-center border-x text-sm font-medium">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() =>
                setQuantity(Math.min(selectedVariant.inventoryQty, quantity + 1))
              }
              disabled={quantity >= selectedVariant.inventoryQty}
              className="text-foreground hover:bg-muted flex h-10 w-10 items-center justify-center transition-colors disabled:opacity-50"
              aria-label="Increase quantity"
            >
              <Plus className="h-4 w-4" />
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
          disabled={!selectedVariant || selectedVariant.inventoryQty === 0}
          className={`bg-primary text-primary-foreground flex flex-1 items-center justify-center gap-2 px-8 py-3 text-sm font-medium tracking-wide transition-opacity disabled:cursor-not-allowed disabled:opacity-50 ${
            !isAdded && "hover:opacity-90"
          }`}
        >
          {isAdded ? (
            <>
              <Check className="h-4 w-4" />
              Added to Cart
            </>
          ) : (
            `Add ${quantity > 1 ? quantity : ""} to Cart`.trim()
          )}
        </button>
        <button
          type="button"
          onClick={handleBuyNow}
          disabled={!selectedVariant || selectedVariant.inventoryQty === 0}
          className="border-foreground text-foreground hover:bg-foreground hover:text-background flex flex-1 items-center justify-center gap-2 border px-8 py-3 text-sm font-medium tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          Buy Now
        </button>
      </div>
    </div>
  );
}
