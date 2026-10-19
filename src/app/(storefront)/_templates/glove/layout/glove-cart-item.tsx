"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";

import type { CartItem } from "~/providers/cart-context";
import { formatPrice } from "~/lib/prices";
import { cartItemId, useCart } from "~/providers/cart-context";

import { GloveLineOptions } from "../shared/glove-line-options";

type GloveCartItemProps = {
  item: CartItem;
  /** Called when the product link is followed (closes the drawer). */
  onNavigate?: () => void;
};

function ProductName({
  item,
  onNavigate,
}: {
  item: CartItem;
  onNavigate?: () => void;
}) {
  return item.productSlug ? (
    <Link
      href={`/shop/${item.productSlug}`}
      onClick={onNavigate}
      className="transition-colors hover:text-[var(--glove-primary)]"
    >
      {item.productName}
    </Link>
  ) : (
    item.productName
  );
}

function LinePrice({ item }: { item: CartItem }) {
  const { price, compareAtPrice, quantity } = item;
  const isOnSale =
    compareAtPrice != null && compareAtPrice > 0 && compareAtPrice > price;
  return (
    <>
      {isOnSale ? (
        <span className="mr-1.5 font-normal text-[var(--glove-muted)] line-through">
          <span className="sr-only">Original price </span>
          {formatPrice(compareAtPrice * quantity)}
        </span>
      ) : null}
      {formatPrice(price * quantity)}
    </>
  );
}

function QtyControl({ item }: { item: CartItem }) {
  const { updateLineQuantity } = useCart();
  const { productName, quantity, maxInventory } = item;
  const lineId = cartItemId(item);
  const atMax = maxInventory !== undefined && quantity >= maxInventory;
  return (
    <div className="inline-flex items-center rounded-[3px] border border-[var(--glove-line)] bg-[var(--glove-paper)]">
      <button
        type="button"
        onClick={() => updateLineQuantity(lineId, quantity - 1)}
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
        onClick={() => updateLineQuantity(lineId, quantity + 1)}
        disabled={atMax}
        aria-label={`Increase quantity of ${productName}`}
        className="inline-flex size-9 items-center justify-center text-[var(--glove-ink)] transition-colors hover:text-[var(--glove-primary)] disabled:opacity-40"
      >
        <Plus className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * Cart drawer line: 64px image, name, variant, chosen options (a configured
 * build), qty stepper, line price, remove. Lines are flat: remove and the
 * stepper act on exactly this line (`cartItemId`), so two builds of the same
 * glove stay independent, and an old `addOnFor` line in a saved cart is just
 * another row.
 */
export function GloveCartItem({ item, onNavigate }: GloveCartItemProps) {
  const { removeLine } = useCart();
  const { productName, variantName, imageUrl } = item;

  return (
    <li className="border-b border-[var(--glove-line)] py-4">
      <div className="flex gap-3">
        <div className="relative size-16 shrink-0 overflow-hidden bg-[var(--glove-wash)]">
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
                <ProductName item={item} onNavigate={onNavigate} />
              </p>
              {variantName ? (
                <p className="text-[13px] text-[var(--glove-muted)]">
                  {variantName}
                </p>
              ) : null}
              <GloveLineOptions item={item} size="sm" />
            </div>
            <button
              type="button"
              onClick={() => removeLine(cartItemId(item))}
              aria-label={`Remove ${productName} from cart`}
              className="-mt-1 -mr-2 inline-flex size-11 shrink-0 items-center justify-center text-[var(--glove-muted)] transition-colors hover:text-[var(--glove-alert)]"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <QtyControl item={item} />
            <p className="glove-body text-[15px] font-bold text-[var(--glove-ink)]">
              <LinePrice item={item} />
            </p>
          </div>
        </div>
      </div>
    </li>
  );
}
