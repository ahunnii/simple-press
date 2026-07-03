"use client";

import { Check, Minus, Plus, ShoppingBag } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import { useProduct } from "~/hooks/use-product";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { NotifyMeForm } from "~/app/(storefront)/_components/product/notify-me-form";

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
    justAdded,
  } = useProduct(product);

  return (
    <>
      {/* S-2: live region for add-to-cart announcement */}
      <span className="sr-only" role="status" aria-live="polite">
        {justAdded ? `${product.name} added to cart` : ""}
      </span>

      {additionalFields?.comingSoon ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-800 dark:bg-amber-950">
          <p className="font-semibold text-amber-700 dark:text-amber-300">
            Coming Soon
          </p>
          {/* M-7: amber-600 → amber-700 */}
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
            This product isn&apos;t available yet. Check back later!
          </p>
        </div>
      ) : Object.keys(variantOptions).length > 0 ? (
        <PollenVariantSelector
          product={product}
          setSelectedVariantId={setSelectedVariantId}
        />
      ) : !inStock ? (
        <div className="flex flex-col gap-4">
          {/* S-5: keep focusable — remove disabled, add aria-disabled + no-op onClick */}
          <Button
            size="lg"
            aria-disabled="true"
            onClick={(e) => e.preventDefault()}
            className="flex opacity-60"
          >
            Out of Stock
          </Button>
          <NotifyMeForm
            productId={product.id}
            message="Get notified when it's back in stock."
            messageClassName="text-sm text-[#2a351f]/80"
            inputClassName="border-[#2a351f]/20 text-[#2a351f]"
            buttonClassName="border-[#215935] text-[#215935]"
          />
        </div>
      ) : (
        <>
          {canAddMore && (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Label>Quantity</Label>
              {/* S-3: wrap stepper in role="group" with aria-label */}
              <div
                role="group"
                aria-label={`Quantity for ${product.name}`}
                className="flex items-center gap-1 rounded-md border border-[#2a351f]/20"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 text-[#2a351f] hover:bg-[#2a351f]/5"
                  onClick={() => handleDecrement()}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                >
                  <Minus className="size-4" aria-hidden="true" />
                </Button>
                {/* S-3: aria-live on the quantity value span */}
                <span
                  className="w-10 text-center text-base font-semibold text-[#2a351f]"
                  aria-live="polite"
                >
                  {quantity}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 text-[#2a351f] hover:bg-[#2a351f]/5"
                  onClick={() => handleIncrement()}
                  aria-label="Increase quantity"
                >
                  <Plus className="size-4" aria-hidden="true" />
                </Button>
              </div>
              <Button
                size="lg"
                onClick={handleAddToCart}
                className="flex-1 gap-2 bg-[#215935] text-white hover:bg-[#1a4729] sm:flex-none"
              >
                {justAdded ? (
                  <>
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Added to Cart
                  </>
                ) : (
                  <>
                    <ShoppingBag className="size-5" aria-hidden="true" />
                    Add to Cart — {formatPrice(displayPrice)}
                  </>
                )}
              </Button>
            </div>
          )}

          {/* M-7: amber-600 → amber-700 */}
          {!canAddMore && inStock && (
            <p className="mt-3 text-center text-sm text-amber-700">
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
