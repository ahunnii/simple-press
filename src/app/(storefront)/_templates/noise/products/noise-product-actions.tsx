"use client";

import { useState } from "react";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import { useProduct } from "~/hooks/use-product";
import { Button } from "~/components/ui/button";

import { NoiseVariantSelector } from "./noise-variant-selector";

export function NoiseProductActions({
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
      {/* Add to cart / variants */}
      {Object.keys(variantOptions).length > 0 ? (
        <NoiseVariantSelector
          product={product}
          setSelectedVariantId={setSelectedVariantId}
        />
      ) : additionalFields?.comingSoon ? (
        <div className="border-border bg-secondary border px-5 py-4">
          <p className="text-foreground font-sans text-xs tracking-[0.2em] uppercase">
            Coming Soon
          </p>
          <p className="text-muted-foreground mt-1 font-sans text-sm">
            This piece isn&apos;t available yet. Check back soon.
          </p>
        </div>
      ) : !inStock ? (
        <Button
          size="lg"
          disabled
          className="w-full rounded-none font-sans text-[10px] tracking-[0.25em] uppercase"
        >
          Sold Out
        </Button>
      ) : (
        <>
          {canAddMore && (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {/* Quantity */}
              <div className="border-border flex items-center border">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11 rounded-none"
                  onClick={handleDecrement}
                  disabled={quantity <= 1}
                >
                  <Minus className="size-3.5" />
                </Button>
                <span className="text-foreground w-11 text-center font-sans text-sm font-medium">
                  {quantity}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11 rounded-none"
                  onClick={handleIncrement}
                >
                  <Plus className="size-3.5" />
                </Button>
              </div>

              <Button
                size="lg"
                onClick={addToCart}
                className="flex-1 rounded-none font-sans text-[10px] tracking-[0.25em] uppercase"
              >
                {isAdded ? (
                  <>
                    <Check className="mr-2 h-3.5 w-3.5" />
                    Added to Cart
                  </>
                ) : (
                  <>
                    <ShoppingBag className="mr-2 size-4" />
                    Add to Cart — {formatPrice(displayPrice)}
                  </>
                )}
              </Button>
            </div>
          )}
          {!canAddMore && inStock && (
            <p className="font-sans text-xs text-amber-600">
              Maximum available quantity in cart
            </p>
          )}
          {product.trackInventory &&
            product.allowBackorders &&
            (product.inventoryQty ?? 0) === 0 && (
              <p className="text-muted-foreground font-sans text-xs">
                Backordered — ships when available
              </p>
            )}
        </>
      )}
    </>
  );
}
