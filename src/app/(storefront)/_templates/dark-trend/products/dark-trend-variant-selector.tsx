"use client";

import { useEffect, useState } from "react";
import { Check, Minus, Plus } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { useCart } from "~/providers/cart-context";
import { useVariantImage } from "~/app/(storefront)/_components/product-page/variant-image-context";
import { NotifyMeForm } from "~/app/(storefront)/_components/product/notify-me-form";

type Props = {
  product: NonNullable<RouterOutputs["product"]["get"]>;
  setSelectedVariantId: (variantId: string | null) => void;
};

export function DarkTrendVariantSelector({
  product,
  setSelectedVariantId,
}: Props) {
  const { addItem } = useCart();
  const { setVariantImageUrl } = useVariantImage();

  const [selectedVariant, setSelectedVariant] = useState(
    product.variants[0] ?? null,
  );
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [liveMessage, setLiveMessage] = useState("");

  useEffect(() => {
    setVariantImageUrl(selectedVariant?.imageUrl ?? null);
  }, [selectedVariant?.imageUrl, setVariantImageUrl]);

  const BACKORDER_MAX = 100;
  const isBackordered =
    product.trackInventory &&
    !!product.allowBackorders &&
    (selectedVariant?.inventoryQty ?? 0) === 0;
  const effectiveMax = !product.trackInventory
    ? BACKORDER_MAX
    : (selectedVariant?.inventoryQty ?? 0) > 0
      ? (selectedVariant?.inventoryQty ?? 0)
      : product.allowBackorders
        ? BACKORDER_MAX
        : 0;

  const handleAddToCart = () => {
    if (!selectedVariant) return;

    addItem(
      {
        productId: product.id,
        variantId: selectedVariant.id,
        productName: product.name,
        variantName: selectedVariant.name,
        price: selectedVariant.price ?? product.price,
        imageUrl: selectedVariant?.imageUrl ?? product.images[0]?.url ?? null,
        sku: selectedVariant.sku,
        maxInventory: effectiveMax,
      },
      quantity, // ← Add specified quantity
    );

    // Reset quantity after adding
    setQuantity(1);

    setIsAdded(true);
    setLiveMessage(
      `Added ${quantity} × ${product.name}${selectedVariant ? ` (${selectedVariant.name})` : ""} to cart`,
    );
    setTimeout(() => {
      setIsAdded(false);
      setLiveMessage("");
    }, 2000);
  };

  const isCartDisabled =
    !selectedVariant ||
    (product.trackInventory &&
      selectedVariant.inventoryQty === 0 &&
      !product.allowBackorders);

  return (
    <div className="space-y-4">
      {/* Visually-hidden live region for add-to-cart announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {liveMessage}
      </div>

      {/* Variant Selection */}
      <div className="mb-6">
        <div
          role="group"
          aria-label="Select Variant"
          className="inline-flex flex-col gap-2"
        >
          <span className="mb-1 block text-sm font-medium text-white">
            Select Variant
          </span>
          <div className="flex flex-wrap gap-3">
            {product.variants.map((variant) => {
              const isOutOfStock =
                product.trackInventory &&
                variant.inventoryQty === 0 &&
                !product.allowBackorders;
              const isBackorderVariant =
                product.trackInventory &&
                variant.inventoryQty === 0 &&
                !!product.allowBackorders;
              return (
                <Button
                  key={variant.id}
                  variant={
                    selectedVariant?.id === variant.id ? "default" : "outline"
                  }
                  aria-pressed={selectedVariant?.id === variant.id}
                  aria-disabled={isOutOfStock ? "true" : undefined}
                  onClick={() => {
                    if (isOutOfStock) return;
                    setSelectedVariant(variant);
                    setSelectedVariantId(variant.id);
                  }}
                  className={`rounded-md px-6 py-3 text-sm transition-colors ${
                    selectedVariant?.id === variant.id
                      ? "bg-violet-600 text-white hover:bg-violet-700"
                      : "border border-white/60 bg-transparent text-white hover:bg-white/10"
                  } ${isOutOfStock ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  {variant.name}
                  {isOutOfStock && " (Out of Stock)"}
                  {isBackorderVariant && " (Pre-order)"}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quantity Selection */}
      {selectedVariant && (
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
              <Button
                variant="outline"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="flex h-10 w-10 items-center justify-center rounded-sm bg-white/10 text-white/60 transition-colors hover:bg-white/20 hover:text-white disabled:opacity-50"
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </Button>

              <span
                aria-live="polite"
                aria-atomic="true"
                className="w-8 text-center font-medium text-white"
              >
                {quantity}
              </span>

              <Button
                variant="outline"
                onClick={() =>
                  setQuantity(Math.min(effectiveMax, quantity + 1))
                }
                disabled={quantity >= effectiveMax}
                className="flex h-10 w-10 items-center justify-center rounded-sm bg-white/10 text-white/60 transition-colors hover:bg-white/20 hover:text-white disabled:opacity-50"
                aria-label="Increase quantity"
                aria-describedby="dt-variant-stock-msg"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </Button>
              <span id="dt-variant-stock-msg" className="text-sm text-white/60">
                {isBackordered
                  ? "Backordered — ships when available"
                  : `${selectedVariant.inventoryQty} available`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Add to Cart */}
      <div className="mb-10 flex flex-col gap-4 sm:flex-row">
        <button
          type="button"
          aria-disabled={isCartDisabled ? "true" : undefined}
          onClick={(e) => {
            if (isCartDisabled) {
              e.preventDefault();
              return;
            }
            handleAddToCart();
          }}
          className={`inline-flex flex-1 items-center justify-center gap-2 rounded-md px-8 py-4 text-sm font-semibold tracking-wider text-white uppercase transition-all ${
            isAdded ? "bg-violet-600" : "bg-violet-600 hover:bg-violet-700"
          } ${isCartDisabled ? "cursor-not-allowed opacity-50" : ""}`}
        >
          {isAdded ? (
            <>
              <Check className="h-4 w-4" aria-hidden="true" />
              Added to Cart
            </>
          ) : (
            `Add ${quantity} to Cart`
          )}
        </button>
      </div>

      {/* Notify me when the selected variant is back in stock */}
      {selectedVariant && isCartDisabled && (
        <NotifyMeForm
          productId={product.id}
          variantId={selectedVariant.id}
          className="text-white"
          message="Get notified when this option is back in stock."
          messageClassName="text-sm text-white/70"
          inputClassName="rounded-md border-white/20 placeholder:text-white/40"
          buttonClassName="rounded-md border-white/40"
        />
      )}
    </div>
  );
}
