"use client";

import { useState } from "react";
import { Check, Minus, Plus } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import { useProduct } from "~/hooks/use-product";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";

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
            <div className="flex flex-col gap-2">
              <Label>Quantity</Label>
              <div className="flex items-center gap-2">
                <div className="flex w-fit items-center rounded-md border">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-10"
                    onClick={() => handleDecrement()}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="size-4" />
                  </Button>
                  <span className="w-10 text-center text-base font-semibold">
                    {quantity}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-10"
                    onClick={() => handleIncrement()}
                    aria-label="Increase quantity"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
                {product.trackInventory && (
                  <span className="text-sm text-gray-600">
                    {product.inventoryQty ?? 0} available
                  </span>
                )}
              </div>
              <Button type="button" onClick={addToCart} className="flex-1">
                {isAdded ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Added to Cart
                  </>
                ) : (
                  `Add ${quantity} to Cart`
                )}
              </Button>
              {product.trackInventory &&
                product.allowBackorders &&
                (product.inventoryQty ?? 0) === 0 && (
                  <p className="text-muted-foreground text-sm">
                    Backordered — ships when available
                  </p>
                )}
            </div>
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
