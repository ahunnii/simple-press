"use client";

import Image from "next/image";
import Link from "next/link";

import type { CartItem } from "~/providers/cart-context";
import { formatPrice } from "~/lib/prices";
import { cartItemId, useCart } from "~/providers/cart-context";

import { GloveLineOptions } from "../shared/glove-line-options";
import { GlovePrice } from "../shared/glove-price";
import { GloveQtyStepper } from "./glove-qty-stepper";

type RowLabels = { price: string; quantity: string; subtotal: string };

type GloveCartRowProps = {
  item: CartItem;
  /** Field labels, kept as screen-reader text now that the table headings are gone. */
  labels: RowLabels;
};

function ProductName({ item }: { item: CartItem }) {
  return item.productSlug ? (
    <Link
      href={`/shop/${item.productSlug}`}
      className="transition-colors hover:text-[var(--glove-primary)]"
    >
      {item.productName}
    </Link>
  ) : (
    item.productName
  );
}

/**
 * One cart line as a clean list row. Thumbnail, then name / variant / unit
 * price / a quiet "Remove" button; the quantity stepper and line total sit
 * on a second row on phones and become right-hand columns from `md`. No
 * visible column labels: the configured headings stay as screen-reader text.
 *
 * A configured glove (product options) is one row with its chain, charms and
 * engraving listed under the variant. Every line is flat: Remove and the
 * stepper act on exactly this line (`cartItemId`), so two builds of the same
 * glove stay independent. An old `addOnFor` chain/charm line left in a saved
 * cart is just another row.
 */
export function GloveCartRow({ item, labels }: GloveCartRowProps) {
  const { updateLineQuantity, removeLine } = useCart();
  const {
    productName,
    variantName,
    price,
    compareAtPrice,
    quantity,
    imageUrl,
    maxInventory,
  } = item;
  const lineId = cartItemId(item);

  return (
    <li className="grid grid-cols-[80px_minmax(0,1fr)] items-start gap-x-4 gap-y-3 border-b border-[var(--glove-line)] py-5 md:grid-cols-[96px_minmax(0,1fr)_auto_104px] md:items-center md:gap-x-6">
      <div className="relative aspect-square w-20 overflow-hidden rounded-[var(--glove-radius-card)] bg-[var(--glove-wash)] md:w-24">
        <Image
          src={imageUrl ?? "/placeholder.svg"}
          alt=""
          fill
          sizes="96px"
          className="object-cover"
        />
      </div>

      <div className="min-w-0">
        <p className="glove-display text-[16px] leading-snug font-medium text-[var(--glove-ink)]">
          <ProductName item={item} />
        </p>
        {variantName ? (
          <p className="mt-0.5 text-[14px] text-[var(--glove-muted)]">
            {variantName}
          </p>
        ) : null}
        <GloveLineOptions item={item} />
        <p className="mt-1">
          <span className="sr-only">{labels.price}: </span>
          <GlovePrice price={price} compareAtPrice={compareAtPrice} size="sm" />
        </p>
        <button
          type="button"
          onClick={() => removeLine(lineId)}
          aria-label={`Remove ${productName} from cart`}
          className="mt-1 -ml-2 inline-flex min-h-11 items-center px-2 text-[14px] text-[var(--glove-muted)] underline underline-offset-4 transition-colors hover:text-[var(--glove-ink)] md:min-h-9"
        >
          Remove
        </button>
      </div>

      {/* Second row on phones (stepper left, line total right); columns from md. */}
      <div className="col-span-full flex items-center justify-between gap-4 md:contents">
        <div role="group" aria-label={`${labels.quantity}: ${productName}`}>
          <GloveQtyStepper
            value={quantity}
            itemLabel={productName}
            max={maxInventory}
            onDecrement={() => updateLineQuantity(lineId, quantity - 1)}
            onIncrement={() => updateLineQuantity(lineId, quantity + 1)}
          />
        </div>
        <p className="glove-body m-0 text-right text-[17px] font-bold text-[var(--glove-ink)]">
          <span className="sr-only">{labels.subtotal}: </span>
          {formatPrice(price * quantity)}
        </p>
      </div>
    </li>
  );
}
