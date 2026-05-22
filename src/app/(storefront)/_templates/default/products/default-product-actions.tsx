"use client";

import { useState } from "react";
import { Check, Minus, Plus } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import { useProduct } from "~/hooks/use-product";

import { DefaultVariantSelector } from "./default-variant-selector";

export function DefaultProductActions({
  product,
}: DefaultProductPageTemplateProps) {
  const {
    inStock,
    variantOptions,
    handleAddToCart,
    canAddMore,
    handleDecrement,
    handleIncrement,
    quantity,
    additionalFields,
    setSelectedVariantId,
  } = useProduct(product);

  const [isAdded, setIsAdded] = useState(false);

  const addToCart = () => {
    handleAddToCart();
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <>
      {Object.keys(variantOptions).length > 0 ? (
        <DefaultVariantSelector
          product={product}
          setSelectedVariantId={setSelectedVariantId}
        />
      ) : additionalFields?.comingSoon ? (
        <div className="rounded-[var(--radius)] border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="font-medium text-amber-700">Coming Soon</p>
          <p className="mt-1 text-sm text-amber-600">
            This product isn&apos;t available yet. Check back later!
          </p>
        </div>
      ) : !inStock ? (
        <button
          type="button"
          disabled
          className="h-12 w-full rounded-[var(--radius)] border border-[#e8e8e8] text-sm font-medium text-[#a3a3a3] cursor-not-allowed"
        >
          Out of Stock
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          {canAddMore && (
            <div className="flex items-center gap-3">
              {/* Qty stepper */}
              <div className="inline-flex h-12 w-[120px] shrink-0 items-center rounded-[var(--radius)] border border-[#e8e8e8]">
                <button
                  type="button"
                  onClick={handleDecrement}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                  className="flex h-full flex-1 items-center justify-center text-lg font-light transition-colors hover:bg-[#f6f6f6] disabled:opacity-30 rounded-l-[var(--radius)]"
                >
                  −
                </button>
                <span className="w-10 text-center text-sm font-medium">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  aria-label="Increase quantity"
                  className="flex h-full flex-1 items-center justify-center text-lg font-light transition-colors hover:bg-[#f6f6f6] rounded-r-[var(--radius)]"
                >
                  +
                </button>
              </div>

              {/* Add to cart */}
              <button
                type="button"
                onClick={addToCart}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[var(--radius)] bg-[#0a0a0a] text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a] active:translate-y-px"
              >
                {isAdded ? (
                  <>
                    <Check className="h-4 w-4" />
                    Added to bag
                  </>
                ) : (
                  `Add to cart`
                )}
              </button>
            </div>
          )}

          {/* Stock count hint */}
          {product.trackInventory && (product.inventoryQty ?? 0) > 0 && (
            <p className="text-xs text-[#6b6b6b]">
              {product.inventoryQty} available
            </p>
          )}
          {product.trackInventory &&
            product.allowBackorders &&
            (product.inventoryQty ?? 0) === 0 && (
              <p className="text-xs text-[#6b6b6b]">
                Backordered — ships when available
              </p>
            )}

          {!canAddMore && inStock && (
            <p className="text-sm text-amber-600">
              You have the maximum available quantity in your cart.
            </p>
          )}
        </div>
      )}
    </>
  );
}
