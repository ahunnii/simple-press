"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";

import type { CartItem as CartItemType } from "~/providers/cart-context";
import { formatPrice } from "~/lib/prices";
import { useCart } from "~/providers/cart-context";

type Props = {
  item: CartItemType;
  index: number;
};

export function NoiseCartItem({ item, index }: Props) {
  const { updateQuantity, removeItem } = useCart();
  const {
    productId,
    productSlug,
    variantId,
    productName,
    variantName,
    price,
    quantity,
    imageUrl,
    sku,
  } = item;

  const lineTotal = price * quantity;

  return (
    <div
      className="border-foreground/15 border-b py-5"
      style={{ background: "var(--vn-paper)" }}
    >
      {/* Desktop: 6-column grid */}
      <div
        className="hidden items-start gap-4 sm:grid"
        style={{ gridTemplateColumns: "80px 1fr auto auto auto auto" }}
      >
        {/* Thumbnail */}
        <div
          className="border-foreground/20 relative flex-shrink-0 overflow-hidden border"
          style={{
            aspectRatio: "3/4",
            width: "80px",
            background: "var(--vn-steel)",
          }}
        >
          <Image
            src={imageUrl ?? "/placeholder.svg"}
            alt=""
            fill
            className="object-cover"
            sizes="80px"
          />
          <span
            className="absolute top-1 left-1 px-1 font-mono text-[8px] tracking-[0.16em] uppercase"
            style={{ background: "var(--vn-bone)", color: "var(--vn-ink)" }}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        {/* Info */}
        <div className="flex min-w-0 flex-col gap-1.5">
          <Link
            href={`/shop/${productSlug ?? productId}`}
            className="font-serif leading-[1.1] tracking-tight italic transition-opacity hover:opacity-70"
            style={{ fontSize: "20px", letterSpacing: "-0.005em" }}
          >
            {productName}
          </Link>
          <div
            className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9.5px] tracking-[0.14em] uppercase"
            style={{ color: "var(--vn-steel)" }}
          >
            {variantName && <span>{variantName}</span>}
            {sku && (
              <>
                {variantName && (
                  <span style={{ color: "var(--vn-rule)" }}>·</span>
                )}
                <span>SKU · {sku}</span>
              </>
            )}
          </div>
          <button
            onClick={() => removeItem(productId, variantId)}
            className="mt-1 w-fit font-mono text-[9.5px] tracking-[0.14em] uppercase transition-opacity hover:opacity-60"
            style={{ color: "var(--vn-steel-mist)" }}
            aria-label={`Remove ${productName}`}
          >
            Remove
          </button>
        </div>

        {/* Unit price */}
        <div
          className="self-center font-mono text-[12px] tracking-[0.06em] whitespace-nowrap"
          style={{ color: "var(--vn-ink)" }}
        >
          {formatPrice(price)}
        </div>

        {/* Qty stepper */}
        <div
          className="flex items-center self-center"
          style={{ border: "1.5px solid var(--vn-ink)" }}
        >
          <button
            className="hover:bg-foreground hover:text-background flex items-center justify-center font-mono transition-colors"
            style={{ width: "44px", height: "44px" }}
            onClick={() => updateQuantity(productId, variantId, quantity - 1)}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
          >
            <Minus className="size-3" />
          </button>
          <span
            className="text-center font-mono text-sm"
            style={{ width: "32px" }}
            aria-live="polite"
            aria-atomic="true"
          >
            {quantity}
          </span>
          <button
            className="hover:bg-foreground hover:text-background flex items-center justify-center font-mono transition-colors"
            style={{ width: "44px", height: "44px" }}
            onClick={() => updateQuantity(productId, variantId, quantity + 1)}
            aria-label="Increase quantity"
          >
            <Plus className="size-3" />
          </button>
        </div>

        {/* Line total */}
        <div
          className="self-center font-mono text-[12px] tracking-[0.06em] whitespace-nowrap"
          style={{ color: "var(--vn-ink)" }}
        >
          {formatPrice(lineTotal)}
        </div>

        {/* Remove × */}
        <button
          onClick={() => removeItem(productId, variantId)}
          className="flex items-center justify-center self-center font-mono text-lg leading-none transition-opacity hover:opacity-50"
          style={{
            color: "var(--vn-steel-mist)",
            minWidth: "44px",
            minHeight: "44px",
          }}
          aria-label={`Remove ${productName}`}
        >
          ×
        </button>
      </div>

      {/* Mobile: stacked layout */}
      <div className="flex gap-3 sm:hidden">
        {/* Thumbnail */}
        <div
          className="border-foreground/20 relative flex-shrink-0 overflow-hidden border"
          style={{
            width: "72px",
            aspectRatio: "3/4",
            background: "var(--vn-steel)",
          }}
        >
          <Image
            src={imageUrl ?? "/placeholder.svg"}
            alt=""
            fill
            className="object-cover"
            sizes="72px"
          />
          <span
            className="absolute top-1 left-1 px-1 font-mono text-[8px] tracking-[0.16em] uppercase"
            style={{ background: "var(--vn-bone)", color: "var(--vn-ink)" }}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        {/* Info + controls */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {/* Name + remove */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col gap-1">
              <Link
                href={`/shop/${productSlug ?? productId}`}
                className="font-serif leading-[1.1] tracking-tight italic transition-opacity hover:opacity-70"
                style={{ fontSize: "17px", letterSpacing: "-0.005em" }}
              >
                {productName}
              </Link>
              {variantName && (
                <span
                  className="font-mono text-[9px] tracking-[0.14em] uppercase"
                  style={{ color: "var(--vn-steel)" }}
                >
                  {variantName}
                </span>
              )}
            </div>
            <button
              onClick={() => removeItem(productId, variantId)}
              className="flex flex-shrink-0 items-center justify-center font-mono text-lg leading-none transition-opacity hover:opacity-50"
              style={{
                color: "var(--vn-steel-mist)",
                minWidth: "44px",
                minHeight: "44px",
              }}
              aria-label={`Remove ${productName}`}
            >
              ×
            </button>
          </div>

          {/* Qty + total row */}
          <div className="flex items-center justify-between">
            <div
              className="flex items-center"
              style={{ border: "1.5px solid var(--vn-ink)" }}
            >
              <button
                className="hover:bg-foreground hover:text-background flex items-center justify-center font-mono transition-colors"
                style={{ width: "44px", height: "44px" }}
                onClick={() =>
                  updateQuantity(productId, variantId, quantity - 1)
                }
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
              >
                <Minus className="size-3" />
              </button>
              <span
                className="text-center font-mono text-sm"
                style={{ width: "32px" }}
                aria-live="polite"
                aria-atomic="true"
              >
                {quantity}
              </span>
              <button
                className="hover:bg-foreground hover:text-background flex items-center justify-center font-mono transition-colors"
                style={{ width: "44px", height: "44px" }}
                onClick={() =>
                  updateQuantity(productId, variantId, quantity + 1)
                }
                aria-label="Increase quantity"
              >
                <Plus className="size-3" />
              </button>
            </div>
            <div
              className="font-mono text-[12px] tracking-[0.06em]"
              style={{ color: "var(--vn-ink)" }}
            >
              {formatPrice(lineTotal)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
