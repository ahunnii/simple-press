"use client";

import { useState } from "react";
import { Check, Minus, Plus } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import { parseCardAdditionalFields } from "~/lib/products";
import { useProduct } from "~/hooks/use-product";

import { ElegantVariantSelector } from "./elegant-variant-selector";

export function ElegantProductActions({
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
    selectedVariantId,
    setSelectedVariantId,
  } = useProduct(product);

  const [isAdded, setIsAdded] = useState(false);

  const additional = parseCardAdditionalFields(product.additionalFields);

  const addToCart = () => {
    handleAddToCart();
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <>
      {/* Quantity + Add to Cart */}
      {Object.keys(variantOptions).length > 0 ? (
        <ElegantVariantSelector
          product={product}
          selectedVariantId={selectedVariantId}
          setSelectedVariantId={setSelectedVariantId}
        />
      ) : additional?.comingSoon ? (
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
          disabled
          className="boty-shadow bg-primary text-primary-foreground inline-flex w-full cursor-not-allowed items-center justify-center rounded-full px-8 py-4 text-sm tracking-wide opacity-50"
        >
          Out of Stock
        </button>
      ) : (
        <>
          {canAddMore && (
            <>
              {/* Quantity Selector */}
              <div className="mb-8">
                <label className="text-foreground mb-3 block text-sm font-medium">
                  Quantity
                </label>
                <div className="bg-card boty-shadow inline-flex items-center gap-4 rounded-full px-2 py-2">
                  <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={quantity <= 1}
                    className="bg-background text-foreground/60 hover:bg-muted hover:text-foreground boty-transition flex h-10 w-10 items-center justify-center rounded-full transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-foreground w-8 text-center font-medium">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={quantity >= remainingStock}
                    className="bg-background text-foreground/60 hover:bg-muted hover:text-foreground boty-transition flex h-10 w-10 items-center justify-center rounded-full transition-colors"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-gray-500">
                    {remainingStock > 1
                      ? `${remainingStock} available`
                      : "Last one!"}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Add to Cart */}
          <div className="mb-10 flex flex-col gap-4 sm:flex-row">
            <button
              type="button"
              onClick={addToCart}
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
                "Add to Cart"
              )}
            </button>
          </div>

          {product.trackInventory &&
            product.allowBackorders &&
            (product.inventoryQty ?? 0) === 0 && (
              <p className="text-muted-foreground text-sm">
                Backordered — ships when available
              </p>
            )}

          {!canAddMore && inStock && (
            <p className="mt-3 text-center text-sm text-amber-500">
              You have the maximum available quantity in your cart
            </p>
          )}
        </>
      )}
    </>
  );
}
