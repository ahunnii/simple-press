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

export function PollenVariantSelector({
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
      quantity,
    );

    setQuantity(1);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* S-2: live region for add-to-cart announcement */}
      <span className="sr-only" role="status" aria-live="polite">
        {isAdded ? `${product.name} added to cart` : ""}
      </span>

      <div className="mb-6">
        <Label className="mb-3 block text-sm font-semibold tracking-wide text-[#2a351f] uppercase">
          Select Variant
        </Label>
        <div className="flex flex-wrap gap-2">
          {product.variants.map((variant) => {
            const outOfStock = variant.inventoryQty === 0;
            return (
              <button
                key={variant.id}
                type="button"
                /* S-4: aria-pressed for selection state */
                aria-pressed={selectedVariant?.id === variant.id}
                /* S-4: aria-disabled instead of native disabled so button stays focusable */
                aria-disabled={outOfStock}
                onClick={() => {
                  /* S-4: guard — no-op when out of stock */
                  if (outOfStock) return;
                  setSelectedVariant(variant);
                  setSelectedVariantId(variant.id);
                }}
                className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                  selectedVariant?.id === variant.id
                    ? "border-[#215935] bg-[#215935] text-white"
                    : "border-[#2a351f]/20 text-[#2a351f] hover:border-[#215935] hover:text-[#215935]"
                } ${outOfStock ? "cursor-not-allowed opacity-50" : ""}`}
              >
                {variant.name}
                {outOfStock && " (Out of Stock)"}
              </button>
            );
          })}
        </div>
      </div>

      {/* S-4: aria-live on the availability line */}
      {selectedVariant && product.trackInventory && (
        <p className="text-sm text-[#4c566a]" aria-live="polite">
          {isBackordered
            ? "Backordered — ships when available"
            : `${selectedVariant.inventoryQty} available`}
        </p>
      )}

      {/* S-3: wrap stepper in role="group" with aria-label */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {selectedVariant && (
          <div
            role="group"
            aria-label={`Quantity for ${product.name}`}
            className="flex items-center gap-1 rounded-md border border-[#2a351f]/20"
          >
            <Button
              variant="ghost"
              size="icon"
              className="size-10 text-[#2a351f] hover:bg-[#2a351f]/5"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
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
              onClick={() => setQuantity(Math.min(effectiveMax, quantity + 1))}
              disabled={quantity >= effectiveMax}
              aria-label="Increase quantity"
            >
              <Plus className="size-4" aria-hidden="true" />
            </Button>
          </div>
        )}

        <Button
          type="button"
          onClick={handleAddToCart}
          disabled={
            !selectedVariant ||
            (product.trackInventory &&
              selectedVariant.inventoryQty === 0 &&
              !product.allowBackorders)
          }
          className="flex-1 bg-[#215935] text-white hover:bg-[#1a4729] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isAdded ? (
            <>
              <Check className="mr-2 h-4 w-4" aria-hidden="true" />
              Added to Cart
            </>
          ) : (
            `Add ${quantity} to Cart`
          )}
        </Button>
      </div>

      {/* Notify me when the selected variant is back in stock */}
      {selectedVariant && effectiveMax === 0 && (
        <NotifyMeForm
          productId={product.id}
          variantId={selectedVariant.id}
          message="Get notified when this option is back in stock."
          messageClassName="text-sm text-[#2a351f]/80"
          inputClassName="border-[#2a351f]/20 text-[#2a351f]"
          buttonClassName="border-[#215935] text-[#215935]"
        />
      )}
    </div>
  );
}
