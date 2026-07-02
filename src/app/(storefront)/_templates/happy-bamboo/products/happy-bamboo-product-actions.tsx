"use client";

import { Check, Minus, Plus, ShoppingBag } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import { useProduct } from "~/hooks/use-product";
import { Button } from "~/components/ui/button";
import { NotifyMeForm } from "~/app/(storefront)/_components/product/notify-me-form";

import { HappyBambooVariantSelector } from "./happy-bamboo-variant-selector";

export function HappyBambooProductActions({
  product,
}: DefaultProductPageTemplateProps) {
  const {
    formatPrice,
    inStock,
    variantOptions,
    displayPrice,
    handleAddToCart,
    additionalFields,
    canAddMore,
    handleDecrement,
    handleIncrement,
    quantity,
    setSelectedVariantId,
    justAdded,
  } = useProduct(product);

  return (
    <>
      {Object.keys(variantOptions).length > 0 ? (
        <HappyBambooVariantSelector
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
        <div className="flex flex-col gap-4">
          <Button
            size="lg"
            aria-disabled={true}
            onClick={(e) => e.preventDefault()}
            className="flex aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
          >
            Out of Stock
          </Button>
          <NotifyMeForm
            productId={product.id}
            message="Get notified when it's back in stock."
            messageClassName="text-muted-foreground text-sm"
            inputClassName="border-border rounded-lg"
            buttonClassName="rounded-lg"
          />
        </div>
      ) : (
        <>
          {canAddMore && (
            <>
              {/* Quantity Selector */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="border-border flex items-center justify-between gap-1 rounded-lg border">
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
                  <span className="text-foreground w-10 text-center text-base font-semibold">
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
                <Button size="lg" onClick={handleAddToCart} className="flex">
                  {justAdded ? (
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
              </div>
              <span
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="sr-only"
              >
                {justAdded ? "Added to cart" : ""}
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
            <p className="mt-3 text-center text-sm text-amber-500">
              You have the maximum available quantity in your cart
            </p>
          )}
        </>
      )}
    </>
  );
}
