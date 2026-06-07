"use client";

import { useState } from "react";
import { Check, Minus, Plus } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import { useProduct } from "~/hooks/use-product";

import { NoiseVariantSelector } from "./noise-variant-selector";

export function SledgeProductActions({
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
    setSelectedVariantId,
    additionalFields,
  } = useProduct(product);

  const [isAdded, setIsAdded] = useState(false);

  const addToCart = () => {
    handleAddToCart();
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const stockQty = product.trackInventory ? (product.inventoryQty ?? 0) : null;
  const showStockCount = stockQty !== null && stockQty > 0 && inStock;

  if (additionalFields?.comingSoon) {
    return (
      <div className="rounded border border-gray-200 bg-gray-50 px-4 py-3">
        <p className="text-sm font-semibold">Coming Soon</p>
        <p className="mt-1 text-xs text-gray-500">
          This item isn&apos;t available yet. Check back soon.
        </p>
      </div>
    );
  }

  /* Products with variants — NoiseVariantSelector handles its own add-to-cart */
  if (Object.keys(variantOptions).length > 0) {
    return (
      <NoiseVariantSelector
        product={product}
        setSelectedVariantId={setSelectedVariantId}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {showStockCount && (
        <p className="text-sm font-medium text-[var(--sl-coral)]">
          {stockQty} in stock
        </p>
      )}

      {product.trackInventory &&
        product.allowBackorders &&
        (product.inventoryQty ?? 0) === 0 && (
          <p className="text-sm text-gray-500">
            Backordered — ships when available
          </p>
        )}

      {inStock && canAddMore && (
        <div className="flex items-stretch gap-3">
          <div className="flex items-center border border-gray-300">
            <button
              type="button"
              className="flex min-h-[46px] items-center justify-center px-3 transition-colors hover:bg-gray-100"
              onClick={handleDecrement}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
            >
              <Minus className="size-3.5" />
            </button>
            <span className="min-w-[40px] text-center text-sm font-medium">
              {quantity}
            </span>
            <button
              type="button"
              className="flex min-h-[46px] items-center justify-center px-3 transition-colors hover:bg-gray-100"
              onClick={handleIncrement}
              aria-label="Increase quantity"
            >
              <Plus className="size-3.5" />
            </button>
          </div>

          <button type="button" onClick={addToCart} className="sl-btn flex-1">
            {isAdded ? (
              <>
                <Check className="size-4" />
                Added!
              </>
            ) : (
              "Add To Cart"
            )}
          </button>
        </div>
      )}

      {inStock && !canAddMore && (
        <p className="text-xs text-[var(--sl-coral)]">
          Maximum available quantity in cart
        </p>
      )}

      {!inStock && (
        <button
          type="button"
          disabled
          className="w-full cursor-not-allowed rounded border border-gray-300 py-3 text-sm font-medium text-gray-400"
        >
          Sold Out
        </button>
      )}
    </div>
  );
}
