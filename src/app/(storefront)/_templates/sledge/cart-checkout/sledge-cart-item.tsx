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

export function SledgeCartItem({ item }: Props) {
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
  const productHref = `/shop/${productSlug ?? productId}`;

  return (
    <div className="border-b border-[var(--sl-border)] bg-white py-5">
      <div className="sl-cart-item-grid hidden items-start gap-4 sm:grid">
        <div className="sl-cart-thumb relative flex-shrink-0 overflow-hidden rounded-sm">
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
            href={productHref}
            className="font-sans text-base leading-tight tracking-[0.04em] text-[var(--sl-ink)] uppercase transition-opacity hover:opacity-70 md:text-lg"
          >
            {productName}
          </Link>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-xs tracking-[0.12em] text-[var(--sl-ink-soft)] uppercase">
            {variantName && <span>{variantName}</span>}
            {sku && (
              <>
                {variantName && (
                  <span className="text-[var(--sl-border-input)]">·</span>
                )}
                <span>SKU · {sku}</span>
              </>
            )}
          </div>
          {/* C-3: coral on white → coral-aa */}
          <button
            onClick={() => removeItem(productId, variantId)}
            className="mt-1 w-fit font-sans text-xs tracking-[0.12em] text-[var(--sl-coral-aa)] uppercase transition-opacity hover:opacity-60"
            aria-label={`Remove ${productName}`}
          >
            Remove
          </button>
        </div>

        {/* M-4: sr-only labels for price and total cells */}
        <div className="self-center font-sans text-sm tracking-[0.04em] whitespace-nowrap text-[var(--sl-ink)]">
          <span className="sr-only">Price: </span>
          {formatPrice(price)}
        </div>

        {/* S-3: quantity stepper group */}
        <div
          role="group"
          aria-label={`Quantity for ${productName}`}
          className="flex items-center self-center overflow-hidden rounded-sm border border-[var(--sl-border-input)]"
        >
          <button
            className="sl-qty-btn flex items-center justify-center font-sans transition-colors hover:bg-[var(--sl-cream)]"
            onClick={() => updateQuantity(productId, variantId, quantity - 1)}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
          >
            <Minus className="size-3" />
          </button>
          <span
            className="sl-qty-input text-center font-sans text-sm"
            aria-live="polite"
          >
            {quantity}
          </span>
          <button
            className="sl-qty-btn flex items-center justify-center font-sans transition-colors hover:bg-[var(--sl-cream)]"
            onClick={() => updateQuantity(productId, variantId, quantity + 1)}
            aria-label="Increase quantity"
          >
            <Plus className="size-3" />
          </button>
        </div>

        <div className="self-center font-sans text-sm tracking-[0.04em] whitespace-nowrap text-[var(--sl-ink)]">
          <span className="sr-only">Line total: </span>
          {formatPrice(lineTotal)}
        </div>

        <button
          onClick={() => removeItem(productId, variantId)}
          className="self-center text-lg leading-none text-[var(--sl-ink-soft)] transition-opacity hover:opacity-50"
          aria-label={`Remove ${productName}`}
        >
          ×
        </button>
      </div>

      <div className="flex gap-3 sm:hidden">
        <div className="sl-cart-thumb-sm relative flex-shrink-0 overflow-hidden rounded-sm">
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
                href={productHref}
                className="font-sans text-base leading-tight tracking-[0.04em] text-[var(--sl-ink)] uppercase transition-opacity hover:opacity-70"
              >
                {productName}
              </Link>
              {variantName && (
                <span className="font-sans text-xs tracking-[0.12em] text-[var(--sl-ink-soft)] uppercase">
                  {variantName}
                </span>
              )}
            </div>
            <button
              onClick={() => removeItem(productId, variantId)}
              className="flex-shrink-0 text-lg leading-none text-[var(--sl-ink-soft)] transition-opacity hover:opacity-50"
              aria-label={`Remove ${productName}`}
            >
              ×
            </button>
          </div>

          <div className="flex items-center justify-between">
            {/* S-3: mobile quantity stepper group */}
            <div
              role="group"
              aria-label={`Quantity for ${productName}`}
              className="flex items-center overflow-hidden rounded-sm border border-[var(--sl-border-input)]"
            >
              <button
                className="sl-qty-btn-sm flex items-center justify-center font-sans transition-colors hover:bg-[var(--sl-cream)]"
                onClick={() =>
                  updateQuantity(productId, variantId, quantity - 1)
                }
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
              >
                <Minus className="size-3" />
              </button>
              <span
                className="sl-qty-input-sm text-center font-sans text-sm"
                aria-live="polite"
              >
                {quantity}
              </span>
              <button
                className="sl-qty-btn-sm flex items-center justify-center font-sans transition-colors hover:bg-[var(--sl-cream)]"
                onClick={() =>
                  updateQuantity(productId, variantId, quantity + 1)
                }
                aria-label="Increase quantity"
              >
                <Plus className="size-3" />
              </button>
            </div>
            <div className="font-sans text-sm tracking-[0.04em] text-[var(--sl-ink)]">
              {formatPrice(lineTotal)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
