"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { useProduct } from "~/hooks/use-product";

import { ModernVariantSelector } from "./modern-variant-selector";

export function ModernProductActions({
  product,
}: {
  product: NonNullable<RouterOutputs["product"]["get"]>;
}) {
  const {
    inStock,
    variantOptions,
    handleAddToCart,
    remainingStock,
    canAddMore,
    handleDecrement,
    handleIncrement,
    quantity,
    setSelectedVariantId,
    cartQuantity,
  } = useProduct(product);

  const [added, setAdded] = useState(false);
  const router = useRouter();

  const trackInventory = product.trackInventory ?? false;
  const allowBackorders = product.allowBackorders ?? false;
  const inventoryQty = product.inventoryQty ?? 0;
  const outOfStock = !inStock;

  function addToCart() {
    handleAddToCart();
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  function handleBuyNow() {
    if (!canAddMore) return;
    handleAddToCart();
    router.push("/checkout");
  }

  return (
    <div className="mt-8">
      {Object.keys(variantOptions).length > 0 ? (
        <ModernVariantSelector
          product={product}
          setSelectedVariantId={setSelectedVariantId}
        />
      ) : (
        <>
          {trackInventory && (
            <p className="text-muted-foreground mb-2 text-sm">
              {allowBackorders
                ? "Backorders allowed"
                : `${inventoryQty} in stock${cartQuantity > 0 ? ` (${cartQuantity} in cart)` : ""}`}
            </p>
          )}
          {/* Quantity Selector */}
          <div className="flex items-center gap-4">
            <span className="text-foreground text-xs font-semibold tracking-widest uppercase">
              Quantity
            </span>
            <div className="border-border flex items-center border">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={outOfStock || quantity <= 1}
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
                onClick={handleIncrement}
                disabled={outOfStock || quantity >= remainingStock}
                className="text-foreground hover:bg-muted flex h-10 w-10 items-center justify-center transition-colors disabled:opacity-50"
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
              onClick={addToCart}
              disabled={outOfStock || !canAddMore}
              className="bg-primary text-primary-foreground flex flex-1 items-center justify-center gap-2 px-8 py-3 text-sm font-medium tracking-wide transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {added ? (
                <>
                  <Check className="h-4 w-4" />
                  Added to Cart
                </>
              ) : outOfStock ? (
                "Out of Stock"
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
              disabled={outOfStock || !canAddMore}
              className="border-foreground text-foreground hover:bg-foreground hover:text-background flex flex-1 items-center justify-center gap-2 border px-8 py-3 text-sm font-medium tracking-wide transition-colors disabled:opacity-50"
            >
              Buy Now
            </button>
          </div>

          {!canAddMore && inStock && (
            <p className="text-muted-foreground mt-3 text-center text-sm">
              You have the maximum available quantity in your cart
            </p>
          )}
        </>
      )}
    </div>
  );
}
