"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";

import type { CartItem } from "~/providers/cart-context";
import { formatPrice } from "~/lib/prices";
import { useCart } from "~/providers/cart-context";

type GloveCartItemProps = {
  item: CartItem;
  /** Called when the product link is followed (closes the drawer). */
  onNavigate?: () => void;
};

/** Cart drawer line: 64px image, name, variant, qty stepper, line price, remove. */
export function GloveCartItem({ item, onNavigate }: GloveCartItemProps) {
  const { updateQuantity, removeItem } = useCart();
  const {
    productId,
    productSlug,
    variantId,
    productName,
    variantName,
    price,
    compareAtPrice,
    quantity,
    imageUrl,
    maxInventory,
  } = item;
  const atMax = maxInventory !== undefined && quantity >= maxInventory;
  const isOnSale =
    compareAtPrice != null && compareAtPrice > 0 && compareAtPrice > price;

  const name = productSlug ? (
    <Link
      href={`/shop/${productSlug}`}
      onClick={onNavigate}
      className="transition-colors hover:text-[var(--glove-primary)]"
    >
      {productName}
    </Link>
  ) : (
    productName
  );

  return (
    <li className="flex gap-3 border-b border-[var(--glove-line)] py-4">
      <div className="relative size-16 shrink-0 overflow-hidden bg-[var(--glove-cloud)]">
        <Image
          src={imageUrl ?? "/placeholder.svg"}
          alt=""
          fill
          sizes="64px"
          className="object-cover"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="glove-display text-[14px] leading-snug font-medium text-[var(--glove-ink)]">
              {name}
            </p>
            {variantName ? (
              <p className="text-[13px] text-[var(--glove-muted)]">
                {variantName}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => removeItem(productId, variantId)}
            aria-label={`Remove ${productName} from cart`}
            className="-mt-1 -mr-2 inline-flex size-11 shrink-0 items-center justify-center text-[var(--glove-muted)] transition-colors hover:text-[var(--glove-alert)]"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center rounded-[3px] border border-[var(--glove-line)]">
            <button
              type="button"
              onClick={() => updateQuantity(productId, variantId, quantity - 1)}
              disabled={quantity <= 1}
              aria-label={`Decrease quantity of ${productName}`}
              className="inline-flex size-9 items-center justify-center text-[var(--glove-ink)] transition-colors hover:text-[var(--glove-primary)] disabled:opacity-40"
            >
              <Minus className="size-3.5" aria-hidden="true" />
            </button>
            <span
              className="w-8 text-center text-[14px] text-[var(--glove-ink)]"
              aria-live="polite"
              aria-atomic="true"
            >
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => updateQuantity(productId, variantId, quantity + 1)}
              disabled={atMax}
              aria-label={`Increase quantity of ${productName}`}
              className="inline-flex size-9 items-center justify-center text-[var(--glove-ink)] transition-colors hover:text-[var(--glove-primary)] disabled:opacity-40"
            >
              <Plus className="size-3.5" aria-hidden="true" />
            </button>
          </div>
          <p className="text-[15px] font-bold text-[var(--glove-primary)]">
            {isOnSale ? (
              <span className="mr-1.5 font-normal text-[var(--glove-muted)] line-through">
                <span className="sr-only">Original price </span>
                {formatPrice(compareAtPrice * quantity)}
              </span>
            ) : null}
            {formatPrice(price * quantity)}
          </p>
        </div>
      </div>
    </li>
  );
}
