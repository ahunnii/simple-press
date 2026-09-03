"use client";

import { useEffect, useState } from "react";
import { Check, Minus, Plus } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { buildVariantCartItem } from "~/lib/products/build-variant-cart-item";
import { pickInitialVariant } from "~/lib/products/initial-variant";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { useCart } from "~/providers/cart-context";
import { useVariantImage } from "~/app/(storefront)/_components/product-page/variant-image-context";
import { NotifyMeForm } from "~/app/(storefront)/_components/product/notify-me-form";

type Props = {
  product: NonNullable<RouterOutputs["product"]["get"]>;
  setSelectedVariantId: (variantId: string | null) => void;
};

export function BambooVariantSelector({
  product,
  setSelectedVariantId,
}: Props) {
  const { addItem } = useCart();
  const { setVariantImageUrl } = useVariantImage();

  const [selectedVariant, setSelectedVariant] = useState(
    pickInitialVariant(product.variants, product),
  );
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

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
      buildVariantCartItem(product, selectedVariant, effectiveMax),
      quantity, // ← Add specified quantity
    );

    // Reset quantity after adding
    setQuantity(1);

    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Variant Selection */}
      <div className="mb-6">
        <Label className="mb-3 block text-sm font-medium" id="variant-label">
          Select Variant
        </Label>
        <div
          className="flex flex-wrap gap-3"
          role="group"
          aria-labelledby="variant-label"
        >
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
                onClick={() => {
                  if (isOutOfStock) return;
                  setSelectedVariant(variant);
                  setSelectedVariantId(variant.id);
                }}
                aria-disabled={isOutOfStock ? "true" : undefined}
                aria-pressed={selectedVariant?.id === variant.id}
                className={`bamboo-variant-btn ${
                  selectedVariant?.id === variant.id
                    ? "bamboo-variant-btn--selected"
                    : "bamboo-variant-btn--unselected"
                } ${isOutOfStock ? "bamboo-variant-btn--disabled cursor-not-allowed opacity-50" : ""}`}
              >
                {variant.name}
                {isOutOfStock && " (Out of Stock)"}
                {isBackorderVariant && " (Pre-order)"}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Quantity Selection */}
        {selectedVariant && (
          <div>
            <Label className="mb-3 block text-sm font-medium">Quantity</Label>
            <div className="border-border flex items-center gap-1 rounded-lg border">
              <Button
                variant="ghost"
                size="icon"
                className="size-11"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
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
                onClick={() =>
                  setQuantity(Math.min(effectiveMax, quantity + 1))
                }
                disabled={quantity >= effectiveMax}
                aria-label="Increase quantity"
              >
                <Plus className="size-4" aria-hidden="true" />
              </Button>
            </div>{" "}
            {selectedVariant && product.trackInventory && (
              <span className="text-sm">
                {isBackordered
                  ? "Backordered — ships when available"
                  : `${selectedVariant?.inventoryQty ?? 0} available`}
              </span>
            )}
          </div>
        )}

        {/* Add to Cart */}
        {(() => {
          const isUnavailable =
            !selectedVariant ||
            (product.trackInventory &&
              selectedVariant.inventoryQty === 0 &&
              !product.allowBackorders);
          return (
            <Button
              type="button"
              onClick={() => {
                if (isUnavailable) return;
                handleAddToCart();
              }}
              aria-disabled={isUnavailable ? "true" : undefined}
              className={`flex-1 ${isUnavailable ? "cursor-not-allowed opacity-50" : ""}`}
            >
              {isAdded ? (
                <>
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Added to Cart
                </>
              ) : (
                `Add ${quantity} to Cart`
              )}
            </Button>
          );
        })()}
        {/* S-1: live region announces add-to-cart confirmation */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {isAdded && selectedVariant
            ? `${product.name} — ${selectedVariant.name} added to cart`
            : ""}
        </div>
      </div>

      {/* Notify me when the selected variant is back in stock */}
      {selectedVariant && effectiveMax === 0 && (
        <NotifyMeForm
          productId={product.id}
          variantId={selectedVariant.id}
          message="Get notified when this option is back in stock."
          messageClassName="text-muted-foreground text-sm"
          inputClassName="border-border rounded-lg"
          buttonClassName="rounded-lg"
        />
      )}
    </div>
  );
}
