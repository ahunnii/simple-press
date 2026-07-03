"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check, Minus, Plus } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { buildVariantCartItem } from "~/lib/products/build-variant-cart-item";
import { useCart } from "~/providers/cart-context";
import { useVariantImage } from "~/app/(storefront)/_components/product-page/variant-image-context";
import { NotifyMeForm } from "~/app/(storefront)/_components/product/notify-me-form";

type VariantSelectorProps = {
  product: NonNullable<RouterOutputs["product"]["get"]>;
  selectedVariantId: string | null;
  setSelectedVariantId: (variantId: string | null) => void;
};

const ease = "cubic-bezier(0.22, 1, 0.36, 1)";

export function ElegantVariantSelector({
  product,
  setSelectedVariantId,
}: VariantSelectorProps) {
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

  const price = selectedVariant?.price ?? product.price;

  return (
    <div>
      {/* Variant chips */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontFamily: "var(--font-mono, ui-monospace)",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--el-ink-soft, #6b6659)",
            marginBottom: 12,
          }}
        >
          Select option
        </div>
        <div
          role="group"
          aria-label="Select option"
          style={{ display: "flex", flexWrap: "wrap", gap: 10 }}
        >
          {product.variants.map((variant) => {
            const isSelected = selectedVariant?.id === variant.id;
            const outOfStock =
              product.trackInventory &&
              variant.inventoryQty === 0 &&
              !product.allowBackorders;
            const isBackorderVariant =
              product.trackInventory &&
              variant.inventoryQty === 0 &&
              !!product.allowBackorders;
            return (
              <button
                key={variant.id}
                type="button"
                aria-disabled={outOfStock || undefined}
                aria-pressed={isSelected}
                onClick={() => {
                  if (outOfStock) return;
                  setSelectedVariant(variant);
                  setSelectedVariantId(variant.id);
                }}
                className="el-variant-btn"
              >
                {variant.name}
                {outOfStock && " · sold out"}
                {isBackorderVariant && " · pre-order"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Qty stepper */}
      {selectedVariant && effectiveMax > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontFamily: "var(--font-mono, ui-monospace)",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--el-ink-soft, #6b6659)",
              marginBottom: 12,
            }}
          >
            Quantity
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              border: "1px solid var(--el-line, rgba(28,26,23,0.12))",
              borderRadius: 999,
              padding: "4px 6px",
            }}
          >
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
              style={{
                width: 28,
                height: 28,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
                border: "none",
                background: "transparent",
                cursor: quantity <= 1 ? "not-allowed" : "pointer",
                color:
                  quantity <= 1
                    ? "var(--el-ink-mute, #9a9485)"
                    : "var(--el-ink, #1c1a17)",
              }}
            >
              <Minus aria-hidden={true} style={{ width: 13, height: 13 }} />
            </button>
            <span
              aria-live="polite"
              aria-atomic="true"
              style={{
                minWidth: 24,
                textAlign: "center",
                fontSize: 14,
                fontWeight: 500,
                color: "var(--el-ink, #1c1a17)",
                fontFamily: "var(--font-sans, sans-serif)",
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
                width: 28,
                height: 28,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
                border: "none",
                background: "transparent",
                cursor: quantity >= effectiveMax ? "not-allowed" : "pointer",
                color:
                  quantity >= effectiveMax
                    ? "var(--el-ink-mute, #9a9485)"
                    : "var(--el-ink, #1c1a17)",
              }}
            >
              <Plus aria-hidden={true} style={{ width: 13, height: 13 }} />
            </button>
            {isBackordered ? (
              <span
                style={{
                  fontSize: 11,
                  color: "var(--el-ink-soft, #6b6659)",
                  paddingRight: 8,
                  fontFamily: "var(--font-mono, ui-monospace)",
                  letterSpacing: "0.1em",
                }}
              >
                Backordered — ships when available
              </span>
            ) : (
              selectedVariant.inventoryQty <= 5 && (
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--el-ink-soft, #6b6659)",
                    paddingRight: 8,
                    fontFamily: "var(--font-mono, ui-monospace)",
                    letterSpacing: "0.1em",
                  }}
                >
                  {selectedVariant.inventoryQty === 1
                    ? "Last one"
                    : `${selectedVariant.inventoryQty} left`}
                </span>
              )
            )}
          </div>
        </div>
      )}

      {/* Add to bag */}
      <div style={{ marginBottom: 24 }}>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!selectedVariant || effectiveMax === 0}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            width: "100%",
            padding: "16px 28px",
            borderRadius: 999,
            fontSize: 13,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontWeight: 500,
            background: isAdded
              ? "var(--el-sage, #4a5240)"
              : !selectedVariant || effectiveMax === 0
                ? "var(--el-cream-3, #e0d9c8)"
                : "var(--el-ink, #1c1a17)",
            color:
              !selectedVariant || effectiveMax === 0
                ? "var(--el-ink-soft, #6b6659)"
                : "var(--el-paper, #fbf8f2)",
            border: "none",
            cursor:
              !selectedVariant || effectiveMax === 0
                ? "not-allowed"
                : "pointer",
            fontFamily: "var(--font-sans, sans-serif)",
            transition: `background 0.4s ${ease}`,
          }}
        >
          {isAdded ? (
            <>
              <Check aria-hidden={true} style={{ width: 14, height: 14 }} />
              Added to bag
            </>
          ) : (
            <>
              Add {quantity > 1 ? `${quantity} ` : ""}to bag
              {price > 0 && ` · $${((price * quantity) / 100).toFixed(0)}`}
              <ArrowRight
                aria-hidden={true}
                style={{ width: 14, height: 14 }}
              />
            </>
          )}
        </button>
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {isAdded ? "Added to bag" : ""}
        </span>

        {/* Notify me when the selected variant is back in stock */}
        {selectedVariant && effectiveMax === 0 && (
          <NotifyMeForm
            productId={product.id}
            variantId={selectedVariant.id}
            className="mt-4"
            message="Get notified when this option is back in stock."
            messageClassName="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--el-ink-soft)]"
            inputClassName="rounded-full border-[var(--el-line)] px-4"
            buttonClassName="rounded-full uppercase tracking-[0.08em] text-xs"
          />
        )}
      </div>
    </div>
  );
}
