"use client";

import { useState } from "react";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import { useProduct } from "~/hooks/use-product";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";

import { PollenVariantSelector } from "./pollen-variant-selector";

export function PollenProductActions({
  product,
}: DefaultProductPageTemplateProps) {
  const {
    formatPrice,
    inStock,
    variantOptions,
    displayPrice,

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

  return (
    <>
      {Object.keys(variantOptions).length > 0 ? (
        <PollenVariantSelector
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
        <Button size="lg" disabled className="flex">
          Out of Stock
        </Button>
      ) : (
        <>
          {canAddMore && (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Label>Quantity</Label>
              <div className="flex items-center gap-1 rounded-md border border-[#2a351f]/20">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 text-[#2a351f] hover:bg-[#2a351f]/5"
                  onClick={() => handleDecrement()}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                >
                  <Minus className="size-4" />
                </Button>
                <span className="w-10 text-center text-base font-semibold text-[#2a351f]">
                  {quantity}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 text-[#2a351f] hover:bg-[#2a351f]/5"
                  onClick={() => handleIncrement()}
                  aria-label="Increase quantity"
                >
                  <Plus className="size-4" />
                </Button>
              </div>
              <Button
                size="lg"
                onClick={addToCart}
                className="flex-1 gap-2 bg-[#215935] text-white hover:bg-[#1a4729] sm:flex-none"
              >
                {isAdded ? (
                  <>
                    <Check className="h-4 w-4" />
                    Added to Cart
                  </>
                ) : (
                  <>
                    <ShoppingBag className="size-5" />
                    Add to Cart — {formatPrice(displayPrice)}
                  </>
                )}
              </Button>
            </div>
          )}

          {!canAddMore && inStock && (
            <p className="mt-3 text-center text-sm text-amber-600">
              You have the maximum available quantity in your cart
            </p>
          )}

          {!inStock && (
            <p className="mt-3 text-center text-sm font-medium text-red-600">
              Out of stock
            </p>
          )}
        </>
      )}
    </>
  );
}
