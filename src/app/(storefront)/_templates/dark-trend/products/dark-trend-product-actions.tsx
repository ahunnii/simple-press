"use client";

import { useState } from "react";
import { Check, Minus, Plus } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { useProduct } from "~/hooks/use-product";
import { NotifyMeForm } from "~/app/(storefront)/_components/product/notify-me-form";
import { SubscribePanel } from "~/app/(storefront)/_components/product/subscribe-panel";

import { DarkTrendVariantSelector } from "./dark-trend-variant-selector";

type DarkTrendProductActionsProps = DefaultProductPageTemplateProps & {
  /** Resolved `dark-trend.product.coming-soon-heading`. */
  comingSoonHeading: string;
  /** Resolved `dark-trend.product.coming-soon-body`; blank hides the line. */
  comingSoonBody: string;
};

export function DarkTrendProductActions({
  product,
  comingSoonHeading,
  comingSoonBody,
}: DarkTrendProductActionsProps) {
  const {
    inStock,
    variantOptions,
    handleAddToCart,
    remainingStock,
    canAddMore,
    handleDecrement,
    handleIncrement,
    quantity,
    setSelectedVariantId,
    selectedVariantId,
    additionalFields,
    isInventoryTracked,
    justAdded,
  } = useProduct(product);

  const [liveMessage, setLiveMessage] = useState("");

  const hasVariants = Object.keys(variantOptions).length > 0;

  // `DarkTrendVariantSelector` keeps its own quantity stepper (separate from
  // `useProduct`'s, which stays 1 for variant products) — mirror its value
  // here so `SubscribePanel` links to `/subscribe` with what the shopper
  // actually picked instead of always `qty=1`.
  const [variantQuantity, setVariantQuantity] = useState(1);
  const subscribeQuantity = hasVariants ? variantQuantity : quantity;

  const addToCart = () => {
    if (!canAddMore) return;
    handleAddToCart();
    setLiveMessage(`Added ${quantity} × ${product.name} to cart`);
    setTimeout(() => {
      setLiveMessage("");
    }, 2000);
  };

  return (
    <>
      {additionalFields?.comingSoon ? (
        <div className="bg-card rounded-md border border-white/10 px-5 py-4">
          <p
            {...fieldAttr("dark-trend.product.coming-soon-heading")}
            className="text-sm font-semibold tracking-[0.2em] text-purple-400 uppercase"
          >
            {comingSoonHeading}
          </p>
          {comingSoonBody.trim() ? (
            <p
              {...fieldAttr("dark-trend.product.coming-soon-body")}
              className="mt-2 text-sm leading-relaxed text-white/70"
            >
              {comingSoonBody}
            </p>
          ) : null}
        </div>
      ) : hasVariants ? (
        <DarkTrendVariantSelector
          product={product}
          setSelectedVariantId={setSelectedVariantId}
          onQuantityChange={setVariantQuantity}
        />
      ) : !inStock ? (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            aria-disabled="true"
            onClick={(e) => e.preventDefault()}
            className="bg-primary hover:bg-primary/90 inline-flex flex-1 items-center justify-center gap-2 rounded-md px-8 py-4 text-sm font-semibold tracking-wider text-white uppercase opacity-50 transition-all"
          >
            Out of Stock
          </button>
          <NotifyMeForm
            productId={product.id}
            message="Get notified when it's back in stock."
            className="text-white"
            messageClassName="text-sm text-white/70"
            inputClassName="rounded-md border-white/20 placeholder:text-white/40"
            buttonClassName="rounded-md border-white/40"
          />
        </div>
      ) : (
        <>
          {/* Visually-hidden live region for add-to-cart announcements */}
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {liveMessage}
          </div>

          {canAddMore && (
            <>
              {/* Quantity Selector */}
              <div className="mb-8">
                <div
                  role="group"
                  aria-label="Quantity"
                  className="inline-flex flex-col gap-2"
                >
                  <span className="block text-sm font-medium text-white">
                    Quantity
                  </span>
                  <div className="bg-card inline-flex items-center gap-4 rounded-md px-4 py-2">
                    <button
                      type="button"
                      onClick={handleDecrement}
                      disabled={quantity <= 1}
                      className="flex h-10 w-10 items-center justify-center rounded-sm bg-white/10 text-white/60 transition-colors hover:bg-white/20 hover:text-white disabled:opacity-50"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <span
                      aria-live="polite"
                      aria-atomic="true"
                      className="w-8 text-center font-medium text-white"
                    >
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={handleIncrement}
                      disabled={quantity >= remainingStock}
                      className="flex h-10 w-10 items-center justify-center rounded-sm bg-white/10 text-white/60 transition-colors hover:bg-white/20 hover:text-white disabled:opacity-50"
                      aria-label="Increase quantity"
                      aria-describedby={
                        isInventoryTracked ? "dt-actions-stock-msg" : undefined
                      }
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>

                    {isInventoryTracked && (
                      <span
                        id="dt-actions-stock-msg"
                        className="text-sm text-white/60"
                      >
                        {remainingStock > 1
                          ? `${remainingStock} available`
                          : "Last one!"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Add to Cart Buttons */}
              <div className="mb-10 flex flex-col gap-4 sm:flex-row">
                <button
                  type="button"
                  onClick={addToCart}
                  className={`inline-flex flex-1 items-center justify-center gap-2 rounded-md px-8 py-4 text-sm font-semibold tracking-wider text-white uppercase transition-all ${
                    justAdded ? "bg-primary" : "bg-primary hover:bg-primary/90"
                  }`}
                >
                  {justAdded ? (
                    <>
                      <Check className="h-4 w-4" aria-hidden="true" />
                      Added to Cart
                    </>
                  ) : (
                    "Add to Cart"
                  )}
                </button>
                {product.trackInventory &&
                  product.allowBackorders &&
                  (product.inventoryQty ?? 0) === 0 && (
                    <p className="text-muted-foreground text-sm">
                      Backordered — ships when available
                    </p>
                  )}
              </div>
            </>
          )}

          {!canAddMore && inStock && (
            <p className="text-muted-foreground mt-3 text-center text-sm">
              You have the maximum available quantity in your cart
            </p>
          )}
        </>
      )}
      <SubscribePanel
        product={product}
        selectedVariantId={selectedVariantId}
        quantity={subscribeQuantity}
        available={inStock}
        className="mt-8"
        ctaClassName="bg-primary hover:bg-primary/90 inline-flex h-11 items-center justify-center gap-2 rounded-md px-8 text-sm font-semibold tracking-wider text-white uppercase transition-all"
      />
    </>
  );
}
