"use client";

import Image from "next/image";
import Link from "next/link";

import type { CartItem } from "~/providers/cart-context";
import { formatPrice } from "~/lib/prices";
import { cartItemId, useCart } from "~/providers/cart-context";

import { GlovePrice } from "../shared/glove-price";
import { GloveQtyStepper } from "./glove-qty-stepper";

type RowLabels = { price: string; quantity: string; subtotal: string };

type GloveCartRowProps = {
  item: CartItem;
  /** Chains/charms picked for this line on its product page, nested under it. */
  addOns?: CartItem[];
  /** This line plus its add-ons, shown under them when there are any. */
  groupTotal?: number;
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
 * A glove with add-ons carries them in a mist panel under its text column
 * (its rows go side by side only once the panel itself is wide enough),
 * then a "Total with add-ons" line. Its Remove takes the add-ons with it (they
 * were picked for this glove); each add-on keeps its own Remove.
 */
export function GloveCartRow({
  item,
  addOns = [],
  groupTotal,
  labels,
}: GloveCartRowProps) {
  const { updateQuantity, removeItem, removeItemWithAddOns } = useCart();
  const {
    productId,
    variantId,
    productName,
    variantName,
    price,
    compareAtPrice,
    quantity,
    imageUrl,
    maxInventory,
  } = item;
  const scope = item.addOnFor ?? null;
  const hasAddOns = addOns.length > 0;

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
        <p className="mt-1">
          <span className="sr-only">{labels.price}: </span>
          <GlovePrice price={price} compareAtPrice={compareAtPrice} size="sm" />
        </p>
        <button
          type="button"
          onClick={() =>
            hasAddOns
              ? removeItemWithAddOns(productId, variantId)
              : removeItem(productId, variantId, scope)
          }
          aria-label={
            hasAddOns
              ? `Remove ${productName} and its add-ons from cart`
              : `Remove ${productName} from cart`
          }
          className="mt-1 -ml-2 inline-flex min-h-11 items-center px-2 text-[14px] text-[var(--glove-muted)] underline underline-offset-4 transition-colors hover:text-[var(--glove-ink)] md:min-h-9"
        >
          {hasAddOns ? "Remove with add-ons" : "Remove"}
        </button>
      </div>

      {/* Second row on phones (stepper left, line total right); columns from md. */}
      <div className="col-span-full flex items-center justify-between gap-4 md:contents">
        <div role="group" aria-label={`${labels.quantity}: ${productName}`}>
          <GloveQtyStepper
            value={quantity}
            itemLabel={productName}
            max={maxInventory}
            onDecrement={() =>
              updateQuantity(productId, variantId, quantity - 1, scope)
            }
            onIncrement={() =>
              updateQuantity(productId, variantId, quantity + 1, scope)
            }
          />
        </div>
        <p className="glove-body m-0 text-right text-[17px] font-bold text-[var(--glove-ink)]">
          <span className="sr-only">{labels.subtotal}: </span>
          {formatPrice(price * quantity)}
        </p>
      </div>

      {hasAddOns ? (
        <div className="@container col-span-full rounded-[var(--glove-radius-card)] border border-[var(--glove-mist-line)] bg-[var(--glove-mist)] px-4 pt-3 pb-1 md:col-span-3 md:col-start-2">
          <p
            id={`glove-addons-${cartItemId(item)}`}
            className="glove-display m-0 text-[13px] font-medium text-[var(--glove-muted)]"
          >
            Added to this glove
          </p>
          <ul
            aria-labelledby={`glove-addons-${cartItemId(item)}`}
            className="m-0 list-none p-0"
          >
            {addOns.map((addOn) => (
              <GloveCartAddOnRow
                key={cartItemId(addOn)}
                item={addOn}
                labels={labels}
              />
            ))}
          </ul>
          {groupTotal !== undefined ? (
            <p className="m-0 flex items-baseline justify-between gap-4 border-t border-[var(--glove-mist-line)] py-3">
              <span className="glove-display text-[15px] font-medium text-[var(--glove-ink)]">
                Total with add-ons
              </span>
              <span className="glove-body text-[17px] font-bold text-[var(--glove-ink)]">
                {formatPrice(groupTotal)}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

/** A chain or charm nested under its glove: smaller, with its own Remove. */
function GloveCartAddOnRow({
  item,
  labels,
}: {
  item: CartItem;
  labels: RowLabels;
}) {
  const { updateQuantity, removeItem } = useCart();
  const {
    productId,
    variantId,
    productName,
    variantName,
    price,
    compareAtPrice,
    quantity,
    imageUrl,
    maxInventory,
  } = item;
  const scope = item.addOnFor ?? null;

  return (
    <li className="grid grid-cols-[56px_minmax(0,1fr)] items-start gap-x-3 gap-y-2 border-b border-[var(--glove-mist-line)] py-3 last:border-b-0 @md:grid-cols-[56px_minmax(0,1fr)_auto_88px] @md:items-center @md:gap-x-5">
      <div className="relative size-14 overflow-hidden rounded-[var(--glove-radius-card)] bg-[var(--glove-paper)]">
        <Image
          src={imageUrl ?? "/placeholder.svg"}
          alt=""
          fill
          sizes="56px"
          className="object-cover"
        />
      </div>

      <div className="min-w-0">
        <p className="glove-display text-[15px] leading-snug font-medium text-[var(--glove-ink)]">
          <ProductName item={item} />
        </p>
        {variantName ? (
          <p className="text-[13px] text-[var(--glove-muted)]">{variantName}</p>
        ) : null}
        <p className="mt-0.5">
          <span className="sr-only">{labels.price}: </span>
          <GlovePrice price={price} compareAtPrice={compareAtPrice} size="sm" />
        </p>
        <button
          type="button"
          onClick={() => removeItem(productId, variantId, scope)}
          aria-label={`Remove ${productName} from cart`}
          className="-ml-2 inline-flex min-h-11 items-center px-2 text-[14px] text-[var(--glove-muted)] underline underline-offset-4 transition-colors hover:text-[var(--glove-ink)] @md:min-h-9"
        >
          Remove
        </button>
      </div>

      <div className="col-span-full flex items-center justify-between gap-4 @md:contents">
        <div role="group" aria-label={`${labels.quantity}: ${productName}`}>
          <GloveQtyStepper
            value={quantity}
            itemLabel={productName}
            max={maxInventory}
            onDecrement={() =>
              updateQuantity(productId, variantId, quantity - 1, scope)
            }
            onIncrement={() =>
              updateQuantity(productId, variantId, quantity + 1, scope)
            }
          />
        </div>
        <p className="glove-body m-0 text-right text-[15px] font-bold text-[var(--glove-ink)]">
          <span className="sr-only">{labels.subtotal}: </span>
          {formatPrice(price * quantity)}
        </p>
      </div>
    </li>
  );
}
