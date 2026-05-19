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
  const { productId, variantId, productName, variantName, price, quantity, imageUrl, sku } = item;

  const lineTotal = price * quantity;

  return (
    <div
      className="border-b border-foreground/15 py-5"
      style={{ background: "var(--vn-paper)" }}
    >
      {/* Desktop: 6-column grid */}
      <div
        className="hidden sm:grid items-start gap-4"
        style={{ gridTemplateColumns: "80px 1fr auto auto auto auto" }}
      >
        {/* Thumbnail */}
        <div
          className="relative overflow-hidden border border-foreground/20 flex-shrink-0"
          style={{ aspectRatio: "3/4", width: "80px", background: "var(--vn-steel)" }}
        >
          <Image
            src={imageUrl ?? "/placeholder.svg"}
            alt={productName}
            fill
            className="object-cover"
            sizes="80px"
          />
          <span
            className="absolute left-1 top-1 font-mono text-[8px] tracking-[0.16em] uppercase px-1"
            style={{ background: "var(--vn-bone)", color: "var(--vn-ink)" }}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        {/* Info */}
        <div className="flex flex-col gap-1.5 min-w-0">
          <Link
            href={`/shop/${productId}`}
            className="font-serif italic leading-[1.1] tracking-tight hover:opacity-70 transition-opacity"
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
                {variantName && <span style={{ color: "var(--vn-rule)" }}>·</span>}
                <span>SKU · {sku}</span>
              </>
            )}
          </div>
          <button
            onClick={() => removeItem(productId, variantId)}
            className="font-mono text-[9.5px] tracking-[0.14em] uppercase w-fit transition-opacity hover:opacity-60 mt-1"
            style={{ color: "var(--vn-steel-mist)" }}
            aria-label={`Remove ${productName}`}
          >
            Remove
          </button>
        </div>

        {/* Unit price */}
        <div
          className="font-mono text-[12px] tracking-[0.06em] whitespace-nowrap self-center"
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
            className="flex items-center justify-center font-mono transition-colors hover:bg-foreground hover:text-background"
            style={{ width: "32px", height: "32px" }}
            onClick={() => updateQuantity(productId, variantId, quantity - 1)}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
          >
            <Minus className="size-3" />
          </button>
          <span
            className="font-mono text-sm text-center"
            style={{ width: "28px" }}
          >
            {quantity}
          </span>
          <button
            className="flex items-center justify-center font-mono transition-colors hover:bg-foreground hover:text-background"
            style={{ width: "32px", height: "32px" }}
            onClick={() => updateQuantity(productId, variantId, quantity + 1)}
            aria-label="Increase quantity"
          >
            <Plus className="size-3" />
          </button>
        </div>

        {/* Line total */}
        <div
          className="font-mono text-[12px] tracking-[0.06em] whitespace-nowrap self-center"
          style={{ color: "var(--vn-ink)" }}
        >
          {formatPrice(lineTotal)}
        </div>

        {/* Remove × */}
        <button
          onClick={() => removeItem(productId, variantId)}
          className="font-mono text-lg leading-none self-center transition-opacity hover:opacity-50"
          style={{ color: "var(--vn-steel-mist)" }}
          aria-label={`Remove ${productName}`}
        >
          ×
        </button>
      </div>

      {/* Mobile: stacked layout */}
      <div className="sm:hidden flex gap-3">
        {/* Thumbnail */}
        <div
          className="relative overflow-hidden border border-foreground/20 flex-shrink-0"
          style={{ width: "72px", aspectRatio: "3/4", background: "var(--vn-steel)" }}
        >
          <Image
            src={imageUrl ?? "/placeholder.svg"}
            alt={productName}
            fill
            className="object-cover"
            sizes="72px"
          />
          <span
            className="absolute left-1 top-1 font-mono text-[8px] tracking-[0.16em] uppercase px-1"
            style={{ background: "var(--vn-bone)", color: "var(--vn-ink)" }}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        {/* Info + controls */}
        <div className="flex flex-1 flex-col gap-3 min-w-0">
          {/* Name + remove */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1 min-w-0">
              <Link
                href={`/shop/${productId}`}
                className="font-serif italic leading-[1.1] tracking-tight hover:opacity-70 transition-opacity"
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
              className="font-mono text-lg leading-none flex-shrink-0 transition-opacity hover:opacity-50"
              style={{ color: "var(--vn-steel-mist)" }}
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
                className="flex items-center justify-center font-mono transition-colors hover:bg-foreground hover:text-background"
                style={{ width: "28px", height: "28px" }}
                onClick={() => updateQuantity(productId, variantId, quantity - 1)}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
              >
                <Minus className="size-3" />
              </button>
              <span
                className="font-mono text-sm text-center"
                style={{ width: "24px" }}
              >
                {quantity}
              </span>
              <button
                className="flex items-center justify-center font-mono transition-colors hover:bg-foreground hover:text-background"
                style={{ width: "28px", height: "28px" }}
                onClick={() => updateQuantity(productId, variantId, quantity + 1)}
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
