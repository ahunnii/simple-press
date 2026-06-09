"use client";

import { useState } from "react";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import { useProduct } from "~/hooks/use-product";
import { Button } from "~/components/ui/button";

import { BambooVariantSelector } from "./bamboo-variant-selector";

export function BambooProductActions({
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
        <BambooVariantSelector
          product={product}
          setSelectedVariantId={setSelectedVariantId}
        />
      ) : additionalFields?.comingSoon ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-800 dark:bg-amber-950">
          <p className="font-semibold text-amber-700 dark:text-amber-300">
            Coming Soon
          </p>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
            This product isn&apos;t available yet. Check back later!
          </p>
        </div>
      ) : !inStock ? (
        <Button
          size="lg"
          aria-disabled="true"
          onClick={(e) => e.preventDefault()}
          className="flex cursor-not-allowed opacity-50"
        >
          Out of Stock
        </Button>
      ) : (
        <>
          {canAddMore && (
            <>
              {/* Quantity Selector */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="border-border flex items-center gap-1 rounded-lg border">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11"
                    onClick={() => handleDecrement()}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="size-4" aria-hidden="true" />
                  </Button>
                  <span
                    className="text-foreground w-10 text-center text-base font-semibold"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    {quantity}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11"
                    onClick={() => handleIncrement()}
                    aria-label="Increase quantity"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                  </Button>
                </div>
                <Button
                  size="lg"
                  onClick={addToCart}
                  className="flex-1 gap-2 sm:flex-none"
                >
                  {isAdded ? (
                    <>
                      <Check className="h-4 w-4" aria-hidden="true" />
                      Added to Cart
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="size-5" aria-hidden="true" />
                      Add to Cart - {formatPrice(displayPrice)}
                    </>
                  )}
                </Button>
                {/* S-1: live region announces add-to-cart confirmation */}
                <div aria-live="polite" aria-atomic="true" className="sr-only">
                  {isAdded ? `${product.name} added to cart` : ""}
                </div>
              </div>
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
            <p className="mt-3 text-center text-sm text-amber-700">
              You have the maximum available quantity in your cart
            </p>
          )}
        </>
      )}
    </>
  );
}
