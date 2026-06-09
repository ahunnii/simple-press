"use client";

import { useState } from "react";
import { Check, Minus, Plus } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import { useProduct } from "~/hooks/use-product";

import { DarkTrendVariantSelector } from "./dark-trend-variant-selector";

export function DarkTrendProductActions({
  product,
}: DefaultProductPageTemplateProps) {
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
    isInventoryTracked,
  } = useProduct(product);

  const [isAdded, setIsAdded] = useState(false);
  const [liveMessage, setLiveMessage] = useState("");

  const addToCart = () => {
    handleAddToCart();
    setIsAdded(true);
    setLiveMessage(`Added ${quantity} × ${product.name} to cart`);
    setTimeout(() => {
      setIsAdded(false);
      setLiveMessage("");
    }, 2000);
  };

  return (
    <>
      {Object.keys(variantOptions).length > 0 ? (
        <DarkTrendVariantSelector
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
          className="bg-primary hover:bg-primary/90 inline-flex flex-1 items-center justify-center gap-2 rounded-md px-8 py-4 text-sm font-semibold tracking-wider text-white uppercase opacity-50 transition-all"
        >
          Out of Stock
        </button>
      ) : (
        <>
          {/* Visually-hidden live region for add-to-cart announcements */}
          <div
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          >
            {liveMessage}
          </div>

          {canAddMore && (
            <>
              {/* Quantity Selector */}
              <div className="mb-8">
                <div
                  role="group"
                  aria-label="Quantity"
                  className="inline-flex flex-col gap-2"
                >
                  <span className="block text-sm font-medium text-white">
                    Quantity
                  </span>
                  <div className="bg-card inline-flex items-center gap-4 rounded-md px-4 py-2">
                    <button
                      type="button"
                      onClick={handleDecrement}
                      disabled={quantity <= 1}
                      className="flex h-10 w-10 items-center justify-center rounded-sm bg-white/10 text-white/60 transition-colors hover:bg-white/20 hover:text-white disabled:opacity-50"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <span
                      aria-live="polite"
                      aria-atomic="true"
                      className="w-8 text-center font-medium text-white"
                    >
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={handleIncrement}
                      disabled={quantity >= remainingStock}
                      className="flex h-10 w-10 items-center justify-center rounded-sm bg-white/10 text-white/60 transition-colors hover:bg-white/20 hover:text-white disabled:opacity-50"
                      aria-label="Increase quantity"
                      aria-describedby={
                        isInventoryTracked
                          ? "dt-actions-stock-msg"
                          : undefined
                      }
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>

                    {isInventoryTracked && (
                      <span
                        id="dt-actions-stock-msg"
                        className="text-sm text-white/60"
                      >
                        {remainingStock > 1
                          ? `${remainingStock} available`
                          : "Last one!"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Add to Cart Buttons */}
          <div className="mb-10 flex flex-col gap-4 sm:flex-row">
            <button
              type="button"
              onClick={addToCart}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-md px-8 py-4 text-sm font-semibold tracking-wider text-white uppercase transition-all ${
                isAdded ? "bg-primary" : "bg-primary hover:bg-primary/90"
              }`}
            >
              {isAdded ? (
                <>
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Added to Cart
                </>
              ) : (
                "Add to Cart"
              )}
            </button>
            {product.trackInventory &&
              product.allowBackorders &&
              (product.inventoryQty ?? 0) === 0 && (
                <p className="text-muted-foreground text-sm">
                  Backordered — ships when available
                </p>
              )}
          </div>

          {!canAddMore && inStock && (
            <p className="text-muted-foreground mt-3 text-center text-sm">
              You have the maximum available quantity in your cart
            </p>
          )}
        </>
      )}
    </>
  );
}
