"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { useVariantImage } from "~/app/(storefront)/_components/product-page/variant-image-context";
import { useCart } from "~/providers/cart-context";

type Props = {
  product: NonNullable<RouterOutputs["product"]["get"]>;
  setSelectedVariantId: (variantId: string | null) => void;
};

export function DefaultVariantSelector({
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

  const addToCartDisabled =
    !selectedVariant ||
    (product.trackInventory &&
      selectedVariant.inventoryQty === 0 &&
      !product.allowBackorders);

  const handleAddToCart = () => {
    if (!selectedVariant) return;
    if (addToCartDisabled) return;

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
      quantity,
    );

    setQuantity(1);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Live region — announces add-to-cart confirmation to screen readers */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {isAdded ? "Added to bag" : ""}
      </span>

      {/* Variant pills */}
      <div className="flex flex-col gap-2.5">
        {/* aria-live="polite" announces the selected variant name to screen readers (N-4) */}
        <span
          id="variant-label"
          aria-live="polite"
          className="text-[11px] font-medium tracking-[0.14em] text-[#6b6b6b] uppercase"
        >
          Select option
          {selectedVariant && (
            <span className="ml-2 font-normal tracking-normal text-[#0a0a0a] normal-case">
              — {selectedVariant.name}
            </span>
          )}
        </span>
        <div
          role="group"
          aria-labelledby="variant-label"
          className="flex flex-wrap gap-2"
        >
          {product.variants.map((variant) => {
            const outOfStock =
              product.trackInventory &&
              variant.inventoryQty === 0 &&
              !product.allowBackorders;
            const isBackorder =
              product.trackInventory &&
              variant.inventoryQty === 0 &&
              !!product.allowBackorders;
            const isSelected = selectedVariant?.id === variant.id;

            return (
              <button
                key={variant.id}
                type="button"
                onClick={() => {
                  if (outOfStock) return;
                  setSelectedVariant(variant);
                  setSelectedVariantId(variant.id);
                }}
                aria-disabled={outOfStock || undefined}
                aria-pressed={isSelected}
                aria-label={`${variant.name}${outOfStock ? ", sold out" : isBackorder ? ", pre-order" : ""}`}
                className={`inline-grid h-10 min-w-12 place-items-center rounded-[var(--radius)] border px-3.5 text-sm transition-colors ${outOfStock ? "cursor-not-allowed opacity-40" : ""} ${
                  isSelected
                    ? "border-[#0a0a0a] bg-[#0a0a0a] text-white"
                    : "border-[#e8e8e8] hover:border-[#0a0a0a]"
                }`}
              >
                {variant.name}
                {isBackorder && !isSelected && (
                  <span
                    className="ml-1 text-[10px] text-[#6b6b6b]"
                    aria-hidden="true"
                  >
                    (pre-order)
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Qty + Add to cart (only shown when a variant is selected) */}
      {selectedVariant && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-3">
            {/* Qty stepper */}
            <div
              role="group"
              aria-label="Quantity"
              className="inline-flex h-12 w-[120px] shrink-0 items-center rounded-[var(--radius)] border border-[#e8e8e8]"
            >
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
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
                onClick={() => setQuantity(Math.min(effectiveMax, quantity + 1))}
                disabled={quantity >= effectiveMax}
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
              aria-disabled={addToCartDisabled || undefined}
              className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-[var(--radius)] bg-[#0a0a0a] text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a] active:translate-y-px ${addToCartDisabled ? "cursor-not-allowed opacity-50" : ""}`}
            >
              {isAdded ? (
                <>
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Added to bag
                </>
              ) : (
                "Add to cart"
              )}
            </button>
          </div>

          {/* Stock hint */}
          {product.trackInventory && (
            <p className="text-xs text-[#6b6b6b]">
              {isBackordered
                ? "Pre-order — ships when available"
                : selectedVariant.inventoryQty > 0
                  ? `${selectedVariant.inventoryQty} available`
                  : null}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
