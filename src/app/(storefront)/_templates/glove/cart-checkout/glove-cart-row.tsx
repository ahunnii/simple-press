"use client";

import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";

import type { CartItem } from "~/providers/cart-context";
import { formatPrice } from "~/lib/prices";
import { useCart } from "~/providers/cart-context";

import { GlovePrice } from "../shared/glove-price";
import { GloveQtyStepper } from "./glove-qty-stepper";

type GloveCartRowProps = {
  item: CartItem;
  labels: { price: string; quantity: string; subtotal: string };
};

/** Column grid shared by the table header and every row on desktop. */
export const GLOVE_CART_GRID =
  "md:grid-cols-[88px_minmax(0,1fr)_110px_140px_110px_44px]";

/**
 * One cart line. Below `md` it is a stacked card (image, name and remove on
 * top; price, stepper and line total on a second row with visible labels).
 * From `md` the second row dissolves into table columns and the labels become
 * screen-reader-only.
 */
export function GloveCartRow({ item, labels }: GloveCartRowProps) {
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

  const name = productSlug ? (
    <Link
      href={`/shop/${productSlug}`}
      className="transition-colors hover:text-[var(--glove-primary)]"
    >
      {productName}
    </Link>
  ) : (
    productName
  );

  return (
    <li
      className={`grid grid-cols-[80px_minmax(0,1fr)_44px] items-start gap-x-4 gap-y-4 border-b border-[var(--glove-line)] py-5 md:items-center ${GLOVE_CART_GRID}`}
    >
      <div className="relative aspect-square w-20 overflow-hidden bg-[var(--glove-cloud)] md:w-[88px]">
        <Image
          src={imageUrl ?? "/placeholder.svg"}
          alt=""
          fill
          sizes="88px"
          className="object-cover"
        />
      </div>

      <div className="min-w-0">
        <p className="glove-display text-[15px] leading-snug font-medium text-[var(--glove-ink)] md:text-[16px]">
          {name}
        </p>
        {variantName ? (
          <p className="mt-0.5 text-[13px] text-[var(--glove-muted)]">
            {variantName}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => removeItem(productId, variantId)}
        aria-label={`Remove ${productName} from cart`}
        className="-mt-2 -mr-2 inline-flex size-11 items-center justify-center justify-self-end text-[var(--glove-muted)] transition-colors hover:text-[var(--glove-alert)] md:order-last md:mt-0 md:mr-0"
      >
        <X className="size-[18px]" aria-hidden="true" />
      </button>

      {/* Second row on phones; three table cells from md. */}
      <div className="col-span-full flex flex-wrap items-start justify-between gap-x-4 gap-y-3 md:contents md:items-center">
        <div className="flex flex-col gap-0.5 md:items-center">
          <span className="glove-display text-[11px] font-medium tracking-[0.06em] text-[var(--glove-muted)] uppercase md:sr-only">
            {labels.price}
          </span>
          <GlovePrice price={price} compareAtPrice={compareAtPrice} size="sm" />
        </div>
        <div className="flex flex-col gap-1 md:items-center">
          <span className="glove-display text-[11px] font-medium tracking-[0.06em] text-[var(--glove-muted)] uppercase md:sr-only">
            {labels.quantity}
          </span>
          <GloveQtyStepper
            value={quantity}
            itemLabel={productName}
            max={maxInventory}
            onDecrement={() =>
              updateQuantity(productId, variantId, quantity - 1)
            }
            onIncrement={() =>
              updateQuantity(productId, variantId, quantity + 1)
            }
          />
        </div>
        <div className="flex flex-col gap-0.5 text-right md:items-center md:text-center">
          <span className="glove-display text-[11px] font-medium tracking-[0.06em] text-[var(--glove-muted)] uppercase md:sr-only">
            {labels.subtotal}
          </span>
          <span className="glove-body text-[16px] font-bold text-[var(--glove-primary)]">
            {formatPrice(price * quantity)}
          </span>
        </div>
      </div>
    </li>
  );
}
