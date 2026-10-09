"use client";

import Image from "next/image";
import { Loader2 } from "lucide-react";

import type { CartItem } from "~/providers/cart-context";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { formatPrice } from "~/lib/prices";
import { cartItemId, useCart } from "~/providers/cart-context";

import { groupGloveCartLines } from "./glove-cart-groups";

type GloveOrderSummaryProps = {
  heading: string;
  taxNote: string;
  deliveryMethod: "ship" | "pickup";
  discountAmount: number;
  /** Authoritative shipping cost from the checkout hook (a live quote when applicable). */
  shipping: number;
  /** True until a destination is known: shows "Calculated at checkout". */
  shippingPending: boolean;
  /** True while a live rate is being fetched for a known destination. */
  shippingCalculating: boolean;
};

const ROW =
  "flex items-baseline justify-between gap-4 border-b border-[var(--glove-mist-line)] py-3";
const DT = "glove-display text-[15px] font-medium text-[var(--glove-ink)]";
const DD = "glove-body m-0 text-[15px] font-bold text-[var(--glove-ink)]";

/** One order line: thumbnail with a quantity badge, name / variant, line total. */
function SummaryLine({
  item,
  compact = false,
}: {
  item: CartItem;
  /** Smaller, for a chain or charm nested under its glove. */
  compact?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`relative shrink-0 overflow-hidden bg-[var(--glove-paper)] ${compact ? "size-10" : "size-14"}`}
      >
        <Image
          src={item.imageUrl ?? "/placeholder.svg"}
          alt=""
          fill
          sizes={compact ? "40px" : "56px"}
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
        <p
          className={`glove-display leading-snug font-medium text-[var(--glove-ink)] ${compact ? "text-[13px]" : "text-[14px]"}`}
        >
          {item.productName}
          <span className="sr-only"> × {item.quantity}</span>
        </p>
        {item.variantName ? (
          <p
            className={`text-[var(--glove-muted)] ${compact ? "text-[12px]" : "text-[13px]"}`}
          >
            {item.variantName}
          </p>
        ) : null}
      </div>
      <span
        className={`glove-body shrink-0 font-bold text-[var(--glove-ink)] ${compact ? "text-[14px]" : "text-[15px]"}`}
      >
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
        {groupGloveCartLines(items).map(({ item, addOns, total }) => (
          <li
            key={cartItemId(item)}
            className="border-b border-[var(--glove-mist-line)] py-3"
          >
            <SummaryLine item={item} />
            {addOns.length > 0 ? (
              <>
                <ul
                  aria-label={`Added to ${item.productName}`}
                  className="m-0 mt-2 ml-[68px] flex list-none flex-col gap-2 border-l border-[var(--glove-mist-line)] p-0 pl-3"
                >
                  {addOns.map((addOn) => (
                    <li key={cartItemId(addOn)}>
                      <SummaryLine item={addOn} compact />
                    </li>
                  ))}
                </ul>
                <p className="m-0 mt-2 ml-[68px] flex items-baseline justify-between gap-3 pl-3 text-[13px] text-[var(--glove-muted)]">
                  <span>Total with add-ons</span>
                  <span className="glove-body font-bold text-[var(--glove-ink)]">
                    {formatPrice(total)}
                  </span>
                </p>
              </>
            ) : null}
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
          <dt className={DT}>Shipping</dt>
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
                Calculated at checkout
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
