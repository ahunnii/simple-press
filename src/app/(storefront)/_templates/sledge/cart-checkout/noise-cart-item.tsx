"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";

import type { CartItem as CartItemType } from "~/providers/cart-context";
import { formatPrice } from "~/lib/prices";
import { useCart } from "~/providers/cart-context";

type Props = {
  item: CartItemType;
};

export function NoiseCartItem({ item }: Props) {
  const { updateQuantity, removeItem } = useCart();
  const { productId, variantId, productName, variantName, price, quantity, imageUrl, sku } = item;

  const lineTotal = price * quantity;

  return (
    <div
      className="border-b py-5"
      style={{ borderColor: "#e8e8e8", background: "#ffffff" }}
    >
      <div
        className="hidden items-start gap-4 sm:grid"
        style={{ gridTemplateColumns: "80px 1fr auto auto auto auto" }}
      >
        <div
          className="relative flex-shrink-0 overflow-hidden rounded-sm"
          style={{ aspectRatio: "3/4", width: "80px", background: "var(--sl-green)" }}
        >
          <Image
            src={imageUrl ?? "/placeholder.svg"}
            alt={productName}
            fill
            className="object-cover"
            sizes="80px"
          />
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <Link
            href={`/shop/${productId}`}
            className="font-sans text-base leading-tight tracking-[0.04em] uppercase transition-opacity hover:opacity-70 md:text-lg"
            style={{ color: "var(--sl-ink)" }}
          >
            {productName}
          </Link>
          <div
            className="flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-xs tracking-[0.12em] uppercase"
            style={{ color: "var(--sl-ink-soft)" }}
          >
            {variantName && <span>{variantName}</span>}
            {sku && (
              <>
                {variantName && <span style={{ color: "#d0d0d0" }}>·</span>}
                <span>SKU · {sku}</span>
              </>
            )}
          </div>
          <button
            onClick={() => removeItem(productId, variantId)}
            className="mt-1 w-fit font-sans text-xs tracking-[0.12em] uppercase transition-opacity hover:opacity-60"
            style={{ color: "var(--sl-coral)" }}
            aria-label={`Remove ${productName}`}
          >
            Remove
          </button>
        </div>

        <div
          className="self-center font-sans text-sm tracking-[0.04em] whitespace-nowrap"
          style={{ color: "var(--sl-ink)" }}
        >
          {formatPrice(price)}
        </div>

        <div
          className="flex items-center self-center overflow-hidden rounded-sm"
          style={{ border: "1px solid #d8d8d8" }}
        >
          <button
            className="flex items-center justify-center font-sans transition-colors hover:bg-[var(--sl-cream)]"
            style={{ width: "32px", height: "32px", color: "var(--sl-ink)" }}
            onClick={() => updateQuantity(productId, variantId, quantity - 1)}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
          >
            <Minus className="size-3" />
          </button>
          <span
            className="text-center font-sans text-sm"
            style={{ width: "28px", color: "var(--sl-ink)" }}
          >
            {quantity}
          </span>
          <button
            className="flex items-center justify-center font-sans transition-colors hover:bg-[var(--sl-cream)]"
            style={{ width: "32px", height: "32px", color: "var(--sl-ink)" }}
            onClick={() => updateQuantity(productId, variantId, quantity + 1)}
            aria-label="Increase quantity"
          >
            <Plus className="size-3" />
          </button>
        </div>

        <div
          className="self-center font-sans text-sm tracking-[0.04em] whitespace-nowrap"
          style={{ color: "var(--sl-ink)" }}
        >
          {formatPrice(lineTotal)}
        </div>

        <button
          onClick={() => removeItem(productId, variantId)}
          className="self-center text-lg leading-none transition-opacity hover:opacity-50"
          style={{ color: "var(--sl-ink-soft)" }}
          aria-label={`Remove ${productName}`}
        >
          ×
        </button>
      </div>

      <div className="flex gap-3 sm:hidden">
        <div
          className="relative flex-shrink-0 overflow-hidden rounded-sm"
          style={{ width: "72px", aspectRatio: "3/4", background: "var(--sl-green)" }}
        >
          <Image
            src={imageUrl ?? "/placeholder.svg"}
            alt={productName}
            fill
            className="object-cover"
            sizes="72px"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col gap-1">
              <Link
                href={`/shop/${productId}`}
                className="font-sans text-base leading-tight tracking-[0.04em] uppercase transition-opacity hover:opacity-70"
                style={{ color: "var(--sl-ink)" }}
              >
                {productName}
              </Link>
              {variantName && (
                <span
                  className="font-sans text-xs tracking-[0.12em] uppercase"
                  style={{ color: "var(--sl-ink-soft)" }}
                >
                  {variantName}
                </span>
              )}
            </div>
            <button
              onClick={() => removeItem(productId, variantId)}
              className="flex-shrink-0 text-lg leading-none transition-opacity hover:opacity-50"
              style={{ color: "var(--sl-ink-soft)" }}
              aria-label={`Remove ${productName}`}
            >
              ×
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div
              className="flex items-center overflow-hidden rounded-sm"
              style={{ border: "1px solid #d8d8d8" }}
            >
              <button
                className="flex items-center justify-center font-sans transition-colors hover:bg-[var(--sl-cream)]"
                style={{ width: "28px", height: "28px", color: "var(--sl-ink)" }}
                onClick={() => updateQuantity(productId, variantId, quantity - 1)}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
              >
                <Minus className="size-3" />
              </button>
              <span
                className="text-center font-sans text-sm"
                style={{ width: "24px", color: "var(--sl-ink)" }}
              >
                {quantity}
              </span>
              <button
                className="flex items-center justify-center font-sans transition-colors hover:bg-[var(--sl-cream)]"
                style={{ width: "28px", height: "28px", color: "var(--sl-ink)" }}
                onClick={() => updateQuantity(productId, variantId, quantity + 1)}
                aria-label="Increase quantity"
              >
                <Plus className="size-3" />
              </button>
            </div>
            <div
              className="font-sans text-sm tracking-[0.04em]"
              style={{ color: "var(--sl-ink)" }}
            >
              {formatPrice(lineTotal)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
