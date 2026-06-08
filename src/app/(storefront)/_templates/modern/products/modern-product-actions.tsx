"use client";

import { useState } from "react";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { useProduct } from "~/hooks/use-product";

import { ModernVariantSelector } from "./modern-variant-selector";

type Props = {
  product: NonNullable<RouterOutputs["product"]["get"]>;
};

export function ModernProductActions({ product }: Props) {
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
    additionalFields,
  } = useProduct(product);

  const [isAdded, setIsAdded] = useState(false);

  const addToCart = () => {
    handleAddToCart();
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <div className="mt-8">
      {Object.keys(variantOptions).length > 0 ? (
        <ModernVariantSelector
          product={product}
          setSelectedVariantId={setSelectedVariantId}
        />
      ) : additionalFields?.comingSoon ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-800 dark:bg-amber-950">
          <p className="font-semibold text-amber-700 dark:text-amber-300">
            Coming Soon
          </p>
          <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
            This product isn&apos;t available yet. Check back later!
          </p>
        </div>
      ) : !inStock ? (
        <button
          type="button"
          aria-disabled="true"
          onClick={(e) => e.preventDefault()}
          className="boty-shadow bg-primary text-primary-foreground flex flex-1 cursor-not-allowed items-center justify-center gap-2 px-8 py-3 text-sm font-medium tracking-wide opacity-50 transition-opacity"
        >
          Out of Stock
        </button>
      ) : (
        <>
          {canAddMore && (
            <>
              {/* Quantity Selector */}
              <div
                role="group"
                aria-label="Quantity"
                className="flex w-fit items-center gap-4"
              >
                <span
                  aria-hidden="true"
                  className="text-foreground text-xs font-semibold tracking-widest uppercase"
                >
                  Quantity
                </span>
                <div className="border-border flex items-center border">
                  <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={quantity <= 1}
                    className="text-foreground hover:bg-muted flex h-10 w-10 items-center justify-center transition-colors disabled:opacity-50"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <span
                    aria-live="polite"
                    aria-atomic="true"
                    className="border-border text-foreground flex h-10 w-12 items-center justify-center border-x text-sm font-medium"
                  >
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={quantity >= remainingStock}
                    className="text-foreground hover:bg-muted flex h-10 w-10 items-center justify-center transition-colors disabled:opacity-50"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={addToCart}
                  disabled={!canAddMore}
                  className="bg-primary text-primary-foreground flex flex-1 items-center justify-center gap-2 px-8 py-3 text-sm font-medium tracking-wide transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {isAdded ? (
                    <>
                      <Check className="h-4 w-4" aria-hidden="true" />
                      Added to Cart
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                      Add to Cart
                    </>
                  )}
                </button>
              </div>
              <span
                className="sr-only"
                aria-live="polite"
                aria-atomic="true"
              >
                {isAdded ? `${product.name} added to cart` : ""}
              </span>
              {product.trackInventory &&
                product.allowBackorders &&
                (product.inventoryQty ?? 0) === 0 && (
                  <p className="text-muted-foreground text-sm">
                    Backordered — ships when available
                  </p>
                )}
            </>
          )}

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
