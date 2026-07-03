"use client";

import { Check } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import { useProduct } from "~/hooks/use-product";
import { NotifyMeForm } from "~/app/(storefront)/_components/product/notify-me-form";

import { ViiVariantSelector } from "./vii-variant-selector";

type ViiProductActionsProps = DefaultProductPageTemplateProps & {
  selectedVariantId: string | null;
  setSelectedVariantId: (variantId: string | null) => void;
};

export function ViiProductActions({
  product,
  selectedVariantId,
  setSelectedVariantId,
}: ViiProductActionsProps) {
  const {
    inStock,
    variantOptions,
    handleAddToCart,
    canAddMore,
    handleDecrement,
    handleIncrement,
    quantity,
    additionalFields,
    justAdded,
  } = useProduct(product);

  const stepperBorder = "1px solid var(--vii-hairline-strong)";

  if (additionalFields?.comingSoon) {
    return (
      <div
        style={{
          borderRadius: "var(--radius)",
          border: "1px solid var(--vii-tan)",
          background: "var(--vii-paper)",
          padding: "16px 20px",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 500,
            fontSize: 16,
            color: "var(--vii-navy)",
            margin: 0,
          }}
        >
          Coming Soon
        </p>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            color: "var(--vii-ink-soft)",
            margin: "4px 0 0",
          }}
        >
          This product isn&apos;t available yet. Check back later!
        </p>
      </div>
    );
  }

  if (Object.keys(variantOptions).length > 0) {
    return (
      <ViiVariantSelector
        product={product}
        selectedVariantId={selectedVariantId}
        setSelectedVariantId={setSelectedVariantId}
      />
    );
  }

  if (!inStock) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <button
          type="button"
          aria-disabled="true"
          onClick={(e) => e.preventDefault()}
          style={{
            height: 48,
            width: "100%",
            borderRadius: "var(--radius)",
            border: stepperBorder,
            background: "transparent",
            color: "var(--vii-ink-soft)",
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            cursor: "not-allowed",
          }}
        >
          Out of Stock
        </button>
        <NotifyMeForm
          productId={product.id}
          message="Get notified when it's back in stock."
          messageClassName="text-sm text-[var(--vii-ink-soft)]"
          inputClassName="rounded-[var(--radius)] border-[var(--vii-hairline-strong)] text-[var(--vii-navy)]"
          buttonClassName="rounded-[var(--radius)] border-[var(--vii-navy)] text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--vii-navy)]"
        />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {canAddMore && (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Qty stepper */}
          <div
            role="group"
            aria-label="Quantity"
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: 48,
              width: 132,
              flexShrink: 0,
              borderRadius: "var(--radius)",
              border: stepperBorder,
            }}
          >
            <button
              type="button"
              onClick={handleDecrement}
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
              onClick={handleIncrement}
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
                cursor: "pointer",
              }}
            >
              <span aria-hidden="true">+</span>
            </button>
          </div>

          {/* Add to cart */}
          <button
            type="button"
            onClick={handleAddToCart}
            data-vii-pulse=""
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
              cursor: "pointer",
              transition: "opacity 0.2s var(--vii-ease)",
              animation: justAdded ? "vii-pulse 0.42s var(--vii-ease)" : "none",
            }}
          >
            {justAdded ? (
              <>
                <Check style={{ width: 16, height: 16 }} aria-hidden="true" />
                Added to bag
              </>
            ) : (
              "Add to cart"
            )}
          </button>
          {/* Live region sibling — announces state change reliably across all AT */}
          <span className="sr-only" aria-live="polite" aria-atomic="true">
            {justAdded ? "Added to bag" : ""}
          </span>
        </div>
      )}

      {/* Stock count hint */}
      {product.trackInventory && (product.inventoryQty ?? 0) > 0 && (
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--vii-ink-soft)",
            margin: 0,
          }}
        >
          {product.inventoryQty} available
        </p>
      )}
      {product.trackInventory &&
        product.allowBackorders &&
        (product.inventoryQty ?? 0) === 0 && (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--vii-ink-soft)",
              margin: 0,
            }}
          >
            Backordered — ships when available
          </p>
        )}

      {!canAddMore && inStock && (
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            color: "var(--vii-ink-soft)",
            margin: 0,
          }}
        >
          You have the maximum available quantity in your cart.
        </p>
      )}
    </div>
  );
}
