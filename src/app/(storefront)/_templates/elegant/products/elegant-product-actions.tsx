"use client";

import { ArrowRight, Check, Minus, Plus } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import { parseCardAdditionalFields } from "~/lib/products";
import { useProduct } from "~/hooks/use-product";
import { NotifyMeForm } from "~/app/(storefront)/_components/product/notify-me-form";

import { ElegantVariantSelector } from "./elegant-variant-selector";

const ease = "cubic-bezier(0.22, 1, 0.36, 1)";

export function ElegantProductActions({
  product,
}: DefaultProductPageTemplateProps) {
  const {
    inStock,
    variantOptions,
    handleAddToCart,
    remainingStock,
    canAddMore,
    handleDecrement,
    handleIncrement,
    quantity,
    selectedVariantId,
    setSelectedVariantId,
    formatPrice,
    displayPrice,
    justAdded,
  } = useProduct(product);

  const additional = parseCardAdditionalFields(product.additionalFields);

  if (additional?.comingSoon) {
    return (
      <div
        style={{
          padding: "16px 20px",
          borderRadius: 8,
          border: "1px solid rgba(217, 185, 168, 0.5)",
          background: "rgba(217, 185, 168, 0.12)",
          marginBottom: 24,
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-mono, ui-monospace)",
            fontSize: 11,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--el-blush, #d9b9a8)",
            marginBottom: 4,
          }}
        >
          Coming Soon
        </p>
        <p
          style={{
            fontSize: 14,
            color: "var(--el-ink-soft, #6b6659)",
            fontFamily: "var(--font-sans, sans-serif)",
          }}
        >
          This product isn&apos;t available yet. Check back soon.
        </p>
      </div>
    );
  }

  if (Object.keys(variantOptions).length > 0) {
    return (
      <ElegantVariantSelector
        product={product}
        selectedVariantId={selectedVariantId}
        setSelectedVariantId={setSelectedVariantId}
      />
    );
  }

  if (!inStock) {
    return (
      <div style={{ marginBottom: 24 }}>
        <button
          type="button"
          aria-disabled="true"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            padding: "16px 28px",
            borderRadius: 999,
            fontSize: 13,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontWeight: 500,
            background: "var(--el-cream-3, #e0d9c8)",
            color: "var(--el-ink-soft, #6b6659)",
            border: "none",
            cursor: "not-allowed",
            fontFamily: "var(--font-sans, sans-serif)",
          }}
        >
          Out of Stock
        </button>
        <NotifyMeForm
          productId={product.id}
          variantId={selectedVariantId}
          className="mt-4"
          message="Get notified when it's back in stock."
          messageClassName="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--el-ink-soft)]"
          inputClassName="rounded-full border-[var(--el-line)] px-4"
          buttonClassName="rounded-full uppercase tracking-[0.08em] text-xs"
        />
      </div>
    );
  }

  return (
    <>
      {canAddMore && (
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
          {/* Qty stepper */}
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
              onClick={handleDecrement}
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
                transition: `background 0.2s ${ease}`,
              }}
              className="el-qty-btn"
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
              onClick={handleIncrement}
              disabled={quantity >= remainingStock}
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
                cursor: quantity >= remainingStock ? "not-allowed" : "pointer",
                color:
                  quantity >= remainingStock
                    ? "var(--el-ink-mute, #9a9485)"
                    : "var(--el-ink, #1c1a17)",
                transition: `background 0.2s ${ease}`,
              }}
              className="el-qty-btn"
            >
              <Plus aria-hidden={true} style={{ width: 13, height: 13 }} />
            </button>
            {remainingStock <= 5 && remainingStock > 0 && (
              <span
                style={{
                  fontSize: 11,
                  color: "var(--el-ink-soft, #6b6659)",
                  paddingRight: 8,
                  fontFamily: "var(--font-mono, ui-monospace)",
                  letterSpacing: "0.1em",
                }}
              >
                {remainingStock === 1 ? "Last one" : `${remainingStock} left`}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Add to bag */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "stretch",
          marginBottom: 24,
        }}
      >
        <button
          type="button"
          onClick={handleAddToCart}
          style={{
            flex: 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "16px 28px",
            borderRadius: 999,
            fontSize: 13,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontWeight: 500,
            background: justAdded
              ? "var(--el-sage, #4a5240)"
              : "var(--el-ink, #1c1a17)",
            color: "var(--el-paper, #fbf8f2)",
            border: "none",
            cursor: "pointer",
            fontFamily: "var(--font-sans, sans-serif)",
            transition: `background 0.4s ${ease}`,
          }}
        >
          {justAdded ? (
            <>
              <Check aria-hidden={true} style={{ width: 14, height: 14 }} />
              Added to bag
            </>
          ) : (
            <>
              Add to bag · {formatPrice(displayPrice * quantity)}
              <ArrowRight
                aria-hidden={true}
                style={{ width: 14, height: 14 }}
              />
            </>
          )}
        </button>
      </div>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {justAdded ? "Added to bag" : ""}
      </span>

      {product.trackInventory &&
        product.allowBackorders &&
        (product.inventoryQty ?? 0) === 0 && (
          <p
            style={{
              fontFamily: "var(--font-mono, ui-monospace)",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--el-ink-soft, #6b6659)",
              marginBottom: 16,
            }}
          >
            Backordered · ships when available
          </p>
        )}

      {!canAddMore && inStock && (
        <p
          style={{
            fontFamily: "var(--font-mono, ui-monospace)",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--el-blush, #d9b9a8)",
            marginBottom: 16,
          }}
        >
          Maximum quantity in cart
        </p>
      )}
    </>
  );
}
