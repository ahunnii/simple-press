"use client";

import { useState } from "react";
import { ArrowRight, Check, Minus, Plus } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { useCart } from "~/providers/cart-context";

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
  const [selectedVariant, setSelectedVariant] = useState(
    product.variants[0] ?? null,
  );
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToCart = () => {
    if (!selectedVariant) return;
    addItem(
      {
        productId: product.id,
        variantId: selectedVariant.id,
        productName: product.name,
        variantName: selectedVariant.name,
        price: selectedVariant.price ?? product.price,
        imageUrl: product.images[0]?.url ?? null,
        sku: selectedVariant.sku,
        maxInventory: selectedVariant.inventoryQty,
      },
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
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {product.variants.map((variant) => {
            const isSelected = selectedVariant?.id === variant.id;
            const outOfStock = variant.inventoryQty === 0;
            return (
              <button
                key={variant.id}
                type="button"
                disabled={outOfStock}
                onClick={() => {
                  setSelectedVariant(variant);
                  setSelectedVariantId(variant.id);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 16px",
                  border: isSelected
                    ? "1px solid var(--el-ink, #1c1a17)"
                    : "1px solid var(--el-line, rgba(28,26,23,0.12))",
                  borderRadius: 999,
                  fontFamily: "var(--font-mono, ui-monospace)",
                  fontSize: 10.5,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: isSelected
                    ? "var(--el-paper, #fbf8f2)"
                    : outOfStock
                      ? "var(--el-ink-mute, #9a9485)"
                      : "var(--el-ink-soft, #6b6659)",
                  background: isSelected
                    ? "var(--el-ink, #1c1a17)"
                    : "var(--el-paper, #fbf8f2)",
                  cursor: outOfStock ? "not-allowed" : "pointer",
                  opacity: outOfStock ? 0.5 : 1,
                  transition: `all 0.3s ${ease}`,
                }}
              >
                {variant.name}
                {outOfStock && " · sold out"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Qty stepper */}
      {selectedVariant && selectedVariant.inventoryQty > 0 && (
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
              <Minus style={{ width: 13, height: 13 }} />
            </button>
            <span
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
              onClick={() =>
                setQuantity(
                  Math.min(selectedVariant.inventoryQty, quantity + 1),
                )
              }
              disabled={quantity >= selectedVariant.inventoryQty}
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
                cursor:
                  quantity >= selectedVariant.inventoryQty
                    ? "not-allowed"
                    : "pointer",
                color:
                  quantity >= selectedVariant.inventoryQty
                    ? "var(--el-ink-mute, #9a9485)"
                    : "var(--el-ink, #1c1a17)",
              }}
            >
              <Plus style={{ width: 13, height: 13 }} />
            </button>
            {selectedVariant.inventoryQty <= 5 && (
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
            )}
          </div>
        </div>
      )}

      {/* Add to bag */}
      <div style={{ marginBottom: 24 }}>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!selectedVariant || selectedVariant.inventoryQty === 0}
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
              : !selectedVariant || selectedVariant.inventoryQty === 0
                ? "var(--el-cream-3, #e0d9c8)"
                : "var(--el-ink, #1c1a17)",
            color:
              !selectedVariant || selectedVariant.inventoryQty === 0
                ? "var(--el-ink-soft, #6b6659)"
                : "var(--el-paper, #fbf8f2)",
            border: "none",
            cursor:
              !selectedVariant || selectedVariant.inventoryQty === 0
                ? "not-allowed"
                : "pointer",
            fontFamily: "var(--font-sans, sans-serif)",
            transition: `background 0.4s ${ease}`,
          }}
        >
          {isAdded ? (
            <>
              <Check style={{ width: 14, height: 14 }} />
              Added to bag
            </>
          ) : (
            <>
              Add {quantity > 1 ? `${quantity} ` : ""}to bag
              {price > 0 && ` · $${((price * quantity) / 100).toFixed(0)}`}
              <ArrowRight style={{ width: 14, height: 14 }} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
