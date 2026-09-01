"use client";

import { Check, Minus, Plus, ShoppingBag } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import { useProduct } from "~/hooks/use-product";
import { NotifyMeForm } from "~/app/(storefront)/_components/product/notify-me-form";

import { BambooVariantSelector } from "./bamboo-variant-selector";

/**
 * Purchase actions: Coming Soon notice, out-of-stock + NotifyMeForm, the
 * variant picker (delegates entirely to `BambooVariantSelector` when the
 * product has variants), or the plain qty-stepper + Add to Cart pair for a
 * simple product. Restyled onto `.bamboo-qty-stepper` /
 * `.bamboo-btn.bamboo-btn-primary` (pine, built-in underline-swipe hover) —
 * wiring (`useProduct`, `handleAddToCart`, `canAddMore`, stock math) is
 * unchanged.
 */
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
    justAdded,
    remainingStock,
    isInventoryTracked,
  } = useProduct(product);

  return (
    <>
      {additionalFields?.comingSoon ? (
        <div className="bamboo-torn-card px-5 py-4">
          <p className="font-heading font-semibold text-[var(--bamboo-pine)]">
            Coming Soon
          </p>
          <p className="mt-1 text-sm text-[var(--bamboo-ink-soft)]">
            This product isn&apos;t available yet. Check back later!
          </p>
        </div>
      ) : Object.keys(variantOptions).length > 0 ? (
        <BambooVariantSelector
          product={product}
          setSelectedVariantId={setSelectedVariantId}
        />
      ) : !inStock ? (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            aria-disabled="true"
            onClick={(e) => e.preventDefault()}
            className="bamboo-btn bamboo-btn-primary cursor-not-allowed justify-center opacity-50"
          >
            Out of Stock
          </button>
          <NotifyMeForm
            productId={product.id}
            message="Get notified when it's back in stock."
            messageClassName="text-[var(--bamboo-ink-soft)] text-sm"
            inputClassName="rounded-full border-2 border-[var(--bamboo-outline)] bg-[var(--bamboo-roll)] focus-visible:border-[var(--bamboo-pine)]"
            buttonClassName="bamboo-btn bamboo-btn-primary"
          />
        </div>
      ) : (
        <>
          {canAddMore && (
            <>
              {/* Quantity Selector */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex flex-col gap-1.5">
                  <div className="bamboo-qty-stepper">
                    <button
                      type="button"
                      onClick={() => handleDecrement()}
                      disabled={quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="size-4" aria-hidden="true" />
                    </button>
                    <span aria-live="polite" aria-atomic="true">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleIncrement()}
                      disabled={quantity >= remainingStock}
                      aria-label="Increase quantity"
                      aria-describedby={
                        isInventoryTracked
                          ? "bamboo-actions-stock-msg"
                          : undefined
                      }
                    >
                      <Plus className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                  {isInventoryTracked && !product.allowBackorders && (
                    <span
                      id="bamboo-actions-stock-msg"
                      className="text-[0.86rem] text-[var(--bamboo-ink-soft)]"
                    >
                      {remainingStock > 1
                        ? `${remainingStock} available`
                        : "Last one!"}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="bamboo-btn bamboo-btn-primary flex-1 justify-center gap-2 sm:flex-none"
                >
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
                </button>
                {/* S-1: live region announces add-to-cart confirmation */}
                <div aria-live="polite" aria-atomic="true" className="sr-only">
                  {justAdded ? `${product.name} added to cart` : ""}
                </div>
              </div>
              {product.trackInventory &&
                product.allowBackorders &&
                (product.inventoryQty ?? 0) === 0 && (
                  <p className="text-[0.9rem] text-[var(--bamboo-ink-soft)]">
                    Backordered — ships when available
                  </p>
                )}
            </>
          )}

          {!canAddMore && inStock && (
            <p className="mt-3 text-center text-sm text-[var(--bamboo-terracotta-deep)]">
              You have the maximum available quantity in your cart
            </p>
          )}
        </>
      )}
    </>
  );
}
