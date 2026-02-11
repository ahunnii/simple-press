"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { useCart } from "~/providers/cart-context";

export function ModernProductActions({
  product,
}: {
  product: NonNullable<RouterOutputs["product"]["get"]>;
}) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();
  const router = useRouter();

  function handleAddToCart() {
    addItem({
      productId: product.id,
      variantId: null,
      productName: product.name,
      variantName: null,
      price: product.price,
      imageUrl: product.images[0]?.url ?? null,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  function handleBuyNow() {
    addItem({
      productId: product.id,
      variantId: null,
      productName: product.name,
      variantName: null,
      price: product.price,
      imageUrl: product.images[0]?.url ?? null,
    });
    router.push("/checkout");
  }

  return (
    <div className="mt-8">
      {/* Quantity Selector */}
      <div className="flex items-center gap-4">
        <span className="text-foreground text-xs font-semibold tracking-widest uppercase">
          Quantity
        </span>
        <div className="border-border flex items-center border">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="text-foreground hover:bg-muted flex h-10 w-10 items-center justify-center transition-colors"
            aria-label="Decrease quantity"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="border-border text-foreground flex h-10 w-12 items-center justify-center border-x text-sm font-medium">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity(quantity + 1)}
            className="text-foreground hover:bg-muted flex h-10 w-10 items-center justify-center transition-colors"
            aria-label="Increase quantity"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleAddToCart}
          className="bg-primary text-primary-foreground flex flex-1 items-center justify-center gap-2 px-8 py-3 text-sm font-medium tracking-wide transition-opacity hover:opacity-90"
        >
          {added ? (
            <>
              <Check className="h-4 w-4" />
              Added to Cart
            </>
          ) : (
            <>
              <ShoppingBag className="h-4 w-4" />
              Add to Cart
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleBuyNow}
          className="border-foreground text-foreground hover:bg-foreground hover:text-background flex flex-1 items-center justify-center gap-2 border px-8 py-3 text-sm font-medium tracking-wide transition-colors"
        >
          Buy Now
        </button>
      </div>
    </div>
  );
}
