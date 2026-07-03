"use client";

import { Check } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import { useProduct } from "~/hooks/use-product";
import { NotifyMeForm } from "~/app/(storefront)/_components/product/notify-me-form";

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
    justAdded,
  } = useProduct(product);

  return (
    <>
      {additionalFields?.comingSoon ? (
        <div className="rounded-[var(--radius)] border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="font-medium text-amber-700">Coming Soon</p>
          <p className="mt-1 text-sm text-amber-700">
            This product isn&apos;t available yet. Check back later!
          </p>
        </div>
      ) : Object.keys(variantOptions).length > 0 ? (
        <DefaultVariantSelector
          product={product}
          setSelectedVariantId={setSelectedVariantId}
        />
      ) : !inStock ? (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            aria-disabled="true"
            onClick={(e) => e.preventDefault()}
            className="h-12 w-full cursor-not-allowed rounded-[var(--radius)] border border-[#e8e8e8] text-sm font-medium text-[#6b6b6b]"
          >
            Out of Stock
          </button>
          <NotifyMeForm
            productId={product.id}
            message="Get notified when it's back in stock."
            messageClassName="text-sm text-[#6b6b6b]"
            inputClassName="rounded-[var(--radius)] border-[#e8e8e8]"
            buttonClassName="rounded-[var(--radius)] border-[#0a0a0a]"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {canAddMore && (
            <div className="flex items-center gap-3">
              {/* Qty stepper */}
              <div
                role="group"
                aria-label="Quantity"
                className="inline-flex h-12 w-[120px] shrink-0 items-center rounded-[var(--radius)] border border-[#e8e8e8]"
              >
                <button
                  type="button"
                  onClick={handleDecrement}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                  className="flex h-full flex-1 items-center justify-center rounded-l-[var(--radius)] text-lg font-light transition-colors hover:bg-[#f6f6f6] disabled:opacity-30"
                >
                  <span aria-hidden="true">−</span>
                </button>
                <span
                  className="w-10 text-center text-sm font-medium"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  aria-label="Increase quantity"
                  className="flex h-full flex-1 items-center justify-center rounded-r-[var(--radius)] text-lg font-light transition-colors hover:bg-[#f6f6f6]"
                >
                  <span aria-hidden="true">+</span>
                </button>
              </div>

              {/* Add to cart */}
              <button
                type="button"
                onClick={handleAddToCart}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[var(--radius)] bg-[#0a0a0a] text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a] active:translate-y-px"
              >
                {justAdded ? (
                  <>
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Added to bag
                  </>
                ) : (
                  `Add to cart`
                )}
              </button>
              {/* Live region sibling — announces state change reliably across all AT */}
              <span className="sr-only" aria-live="polite" aria-atomic="true">
                {justAdded ? "Added to bag" : ""}
              </span>
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
            <p className="text-sm text-amber-700">
              You have the maximum available quantity in your cart.
            </p>
          )}
        </div>
      )}
    </>
  );
}
