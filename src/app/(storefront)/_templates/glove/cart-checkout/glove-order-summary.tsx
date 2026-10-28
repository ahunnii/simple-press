"use client";

import Image from "next/image";
import { Loader2 } from "lucide-react";

import type { DeliveryMethod } from "~/lib/delivery-method";
import type { CartItem } from "~/providers/cart-context";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { formatPrice } from "~/lib/prices";
import { cartItemId, useCart } from "~/providers/cart-context";

import { GloveLineOptions } from "../shared/glove-line-options";

type GloveOrderSummaryProps = {
  heading: string;
  taxNote: string;
  deliveryMethod: DeliveryMethod;
  discountAmount: number;
  /** Authoritative shipping cost from the checkout hook (a live quote when applicable). */
  shipping: number;
  /** True until a destination is known: shows "Calculated at checkout". */
  shippingPending: boolean;
  /** True while a live rate is being fetched for a known destination. */
  shippingCalculating: boolean;
  /** True when local delivery is selected but the customer is ineligible. */
  deliveryUnavailable?: boolean;
};

const ROW =
  "flex items-baseline justify-between gap-4 border-b border-[var(--glove-mist-line)] py-3";
const DT = "glove-display text-[15px] font-medium text-[var(--glove-ink)]";
const DD = "glove-body m-0 text-[15px] font-bold text-[var(--glove-ink)]";

/**
 * One order line: thumbnail with a quantity badge, name / variant / chosen
 * options (a configured line), line total.
 */
function SummaryLine({ item }: { item: CartItem }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative size-14 shrink-0 overflow-hidden bg-[var(--glove-paper)]">
        <Image
          src={item.imageUrl ?? "/placeholder.svg"}
          alt=""
          fill
          sizes="56px"
          className="object-cover"
        />
        <span
          aria-hidden="true"
          className="glove-display absolute top-0 right-0 inline-flex min-w-[20px] items-center justify-center bg-[var(--glove-primary)] px-1 text-[11px] leading-5 font-semibold text-[var(--glove-on-primary)]"
        >
          {item.quantity}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="glove-display text-[14px] leading-snug font-medium text-[var(--glove-ink)]">
          {item.productName}
          <span className="sr-only"> × {item.quantity}</span>
        </p>
        {item.variantName ? (
          <p className="text-[13px] text-[var(--glove-muted)]">
            {item.variantName}
          </p>
        ) : null}
        <GloveLineOptions item={item} size="sm" />
      </div>
      <span className="glove-body shrink-0 text-[15px] font-bold text-[var(--glove-ink)]">
        {formatPrice(item.price * item.quantity)}
      </span>
    </div>
  );
}

/**
 * "Your order" card body: line items, then subtotal / discount / shipping /
 * total. Shipping shows every quote state: pickup, calculating, pending
 * (no destination yet), free, or the quoted amount.
 */
export function GloveOrderSummary({
  heading,
  taxNote,
  deliveryMethod,
  discountAmount,
  shipping,
  shippingPending,
  shippingCalculating,
  deliveryUnavailable,
}: GloveOrderSummaryProps) {
  const { items, subtotal } = useCart();
  const effectiveShipping = deliveryMethod === "pickup" ? 0 : shipping;
  const total = subtotal - discountAmount + effectiveShipping;

  return (
    <div>
      <h2
        className="glove-display text-[22px] leading-tight font-medium text-[var(--glove-ink)]"
        {...fieldAttr("glove.checkout.summary-heading")}
      >
        {heading}
      </h2>

      <ul className="m-0 mt-5 flex list-none flex-col p-0">
        {items.map((item) => (
          <li
            key={cartItemId(item)}
            className="border-b border-[var(--glove-mist-line)] py-3"
          >
            <SummaryLine item={item} />
          </li>
        ))}
      </ul>

      <dl className="m-0 flex flex-col">
        <div className={ROW}>
          <dt className={DT}>Subtotal</dt>
          <dd className={DD}>{formatPrice(subtotal)}</dd>
        </div>
        {discountAmount > 0 ? (
          <div className={ROW}>
            <dt className={DT}>Discount</dt>
            <dd className="glove-body m-0 text-[15px] font-bold text-[var(--glove-success)]">
              -{formatPrice(discountAmount)}
            </dd>
          </div>
        ) : null}
        <div className={ROW}>
          <dt className={DT}>
            {deliveryMethod === "delivery" ? "Delivery" : "Shipping"}
          </dt>
          <dd className={`${DD} text-right`}>
            {deliveryMethod === "pickup" ? (
              "In-store pickup (free)"
            ) : shippingCalculating ? (
              <span
                className="inline-flex items-center gap-1.5 font-normal text-[var(--glove-muted)]"
                aria-live="polite"
              >
                <Loader2
                  className="size-3.5 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
                Calculating…
              </span>
            ) : shippingPending ? (
              <span className="font-normal text-[var(--glove-muted)]">
                {deliveryMethod === "delivery"
                  ? "Enter your ZIP"
                  : "Calculated at checkout"}
              </span>
            ) : deliveryUnavailable ? (
              <span className="font-normal text-[var(--glove-muted)]">
                Not available
              </span>
            ) : shipping === 0 ? (
              "Free"
            ) : (
              formatPrice(shipping)
            )}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 py-4">
          <dt className={DT}>Total</dt>
          <dd className="glove-body m-0 text-[24px] font-bold text-[var(--glove-primary)]">
            {formatPrice(total)}
          </dd>
        </div>
      </dl>
      {taxNote ? (
        <p
          className="text-[13px] leading-relaxed text-[var(--glove-muted)]"
          {...fieldAttr("glove.checkout.tax-note")}
        >
          {taxNote}
        </p>
      ) : null}
    </div>
  );
}
