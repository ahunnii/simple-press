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

export function ViiVariantSelector({ product, setSelectedVariantId }: Props) {
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

  const stepperBorder = "1px solid rgba(30,53,64,0.25)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Live region — announces add-to-cart confirmation to screen readers */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {isAdded ? "Added to bag" : ""}
      </span>

      {/* Variant pills */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <span
          id="variant-label"
          aria-live="polite"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--vii-ink-soft)",
          }}
        >
          Select option
          {selectedVariant && (
            <span
              style={{
                marginLeft: 8,
                fontWeight: 400,
                letterSpacing: "normal",
                textTransform: "none",
                color: "var(--vii-navy)",
              }}
            >
              — {selectedVariant.name}
            </span>
          )}
        </span>
        <div
          role="group"
          aria-labelledby="variant-label"
          style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
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
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: 40,
                  minWidth: 48,
                  padding: "0 14px",
                  borderRadius: "var(--radius)",
                  border: isSelected
                    ? "1px solid var(--vii-navy)"
                    : stepperBorder,
                  background: isSelected ? "var(--vii-navy)" : "transparent",
                  color: isSelected ? "var(--vii-paper)" : "var(--vii-navy)",
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  cursor: outOfStock ? "not-allowed" : "pointer",
                  opacity: outOfStock ? 0.4 : 1,
                  transition: "border-color 0.2s, background 0.2s",
                }}
              >
                {variant.name}
                {isBackorder && !isSelected && (
                  <span
                    aria-hidden="true"
                    style={{ marginLeft: 6, fontSize: 10, color: "var(--vii-ink-soft)" }}
                  >
                    (pre-order)
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Qty + Add to cart */}
      {selectedVariant && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Qty stepper */}
            <div
              role="group"
              aria-label="Quantity"
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 48,
                width: 120,
                flexShrink: 0,
                borderRadius: "var(--radius)",
                border: stepperBorder,
              }}
            >
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
                style={{
                  flex: 1,
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  fontWeight: 300,
                  color: "var(--vii-navy)",
                  background: "transparent",
                  cursor: quantity <= 1 ? "default" : "pointer",
                  opacity: quantity <= 1 ? 0.3 : 1,
                }}
              >
                <span aria-hidden="true">−</span>
              </button>
              <span
                aria-live="polite"
                aria-atomic="true"
                style={{
                  width: 40,
                  textAlign: "center",
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  fontWeight: 500,
                  color: "var(--vii-navy)",
                }}
              >
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(Math.min(effectiveMax, quantity + 1))}
                disabled={quantity >= effectiveMax}
                aria-label="Increase quantity"
                style={{
                  flex: 1,
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  fontWeight: 300,
                  color: "var(--vii-navy)",
                  background: "transparent",
                  cursor: quantity >= effectiveMax ? "default" : "pointer",
                  opacity: quantity >= effectiveMax ? 0.3 : 1,
                }}
              >
                <span aria-hidden="true">+</span>
              </button>
            </div>

            {/* Add to cart */}
            <button
              type="button"
              onClick={handleAddToCart}
              aria-disabled={addToCartDisabled || undefined}
              style={{
                flex: 1,
                height: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                borderRadius: "var(--radius)",
                background: "var(--vii-copper-deep)",
                color: "var(--vii-paper)",
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                cursor: addToCartDisabled ? "not-allowed" : "pointer",
                opacity: addToCartDisabled ? 0.5 : 1,
                transition: "opacity 0.2s",
              }}
            >
              {isAdded ? (
                <>
                  <Check style={{ width: 16, height: 16 }} aria-hidden="true" />
                  Added to bag
                </>
              ) : (
                "Add to cart"
              )}
            </button>
          </div>

          {/* Stock hint */}
          {product.trackInventory && (
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                color: "var(--vii-ink-soft)",
                margin: 0,
              }}
            >
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
