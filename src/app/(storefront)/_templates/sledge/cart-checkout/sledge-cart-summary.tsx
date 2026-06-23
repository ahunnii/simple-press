"use client";

import Link from "next/link";

import type { ShippingConfig } from "~/lib/shipping-utils";
import { formatPrice } from "~/lib/prices";
import {
  calculateShipping,
  getAmountUntilFreeShipping,
  getFreeShippingProgress,
  SHIPPING_TYPES,
} from "~/lib/shipping-utils";
import { useCart } from "~/providers/cart-context";

const REASSURANCE = [
  { icon: "✓", text: "Free shipping on qualifying orders" },
  { icon: "✱", text: "Each piece handcrafted with care" },
  { icon: "↺", text: "All sales final — order what you love" },
] as const;

type Props = {
  shippingConfig: ShippingConfig;
};

export function SledgeCartSummary({ shippingConfig }: Props) {
  const { subtotal, itemCount } = useCart();
  // Zone+weight rates depend on the destination address, which isn't known in
  // the cart — defer to checkout rather than showing a misleading "Free".
  const isZoneWeight =
    shippingConfig.shippingType === SHIPPING_TYPES.ZONE_WEIGHT;
  const shipping = isZoneWeight
    ? 0
    : calculateShipping(subtotal, shippingConfig);
  const estimatedTotal = subtotal + shipping;
  const untilFree = getAmountUntilFreeShipping(subtotal, shippingConfig);
  const progress = getFreeShippingProgress(subtotal, shippingConfig);
  const showFreeBar =
    shippingConfig.shippingType === SHIPPING_TYPES.FLAT_RATE_WITH_THRESHOLD &&
    progress !== null &&
    untilFree !== null &&
    untilFree > 0;

  return (
    <div className="sl-card-shadow overflow-hidden rounded-sm bg-white">
      <div className="border-b border-[var(--sl-border)] px-6 pt-6 pb-4">
        <h2 className="sl-rail-heading font-heading text-[var(--sl-orange)] uppercase">
          Order Summary
        </h2>
      </div>

      <div className="flex flex-col gap-3 border-b border-[var(--sl-border)] px-6 py-5">
        <div className="flex items-baseline justify-between gap-4">
          <span className="font-sans text-xs tracking-[0.14em] text-[var(--sl-ink-soft)] uppercase">
            Subtotal — {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
          <span className="font-sans text-sm tracking-[0.04em] text-[var(--sl-ink)]">
            {formatPrice(subtotal)}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <span className="font-sans text-xs tracking-[0.14em] text-[var(--sl-ink-soft)] uppercase">
            Est. shipping
          </span>
          <span className="font-sans text-sm tracking-[0.04em] text-[var(--sl-ink)]">
            {isZoneWeight ? (
              <span className="text-[var(--sl-ink-soft)]">
                Calculated at checkout
              </span>
            ) : shipping === 0 ? (
              <span className="text-[var(--sl-ink-soft)]">Free</span>
            ) : (
              formatPrice(shipping)
            )}
          </span>
        </div>
      </div>

      {showFreeBar && untilFree !== null && progress !== null && (
        <div className="border-b border-[var(--sl-border)] px-6 py-4">
          <div className="mb-2 flex justify-between">
            <span className="font-sans text-xs tracking-[0.12em] text-[var(--sl-ink-soft)] uppercase">
              Free shipping at{" "}
              {shippingConfig.freeShippingThreshold
                ? formatPrice(shippingConfig.freeShippingThreshold)
                : ""}
            </span>
            <span className="font-sans text-xs tracking-[0.12em] text-[var(--sl-ink-soft)] uppercase">
              {Math.round(progress * 100)}%
            </span>
          </div>
          {/* N-4: progress bar is decorative — adjacent text conveys progress */}
          <div
            aria-hidden="true"
            className="relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--sl-cream)]"
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-[var(--sl-coral)] transition-all"
              style={{
                width: `${Math.min(100, Math.round(progress * 100))}%`,
              }}
            />
          </div>
          <p className="mt-2 font-sans text-xs tracking-[0.12em] text-[var(--sl-ink-soft)] uppercase">
            {formatPrice(untilFree)} to go
          </p>
        </div>
      )}

      <div className="flex items-baseline justify-between gap-4 border-b border-[var(--sl-border)] bg-[var(--sl-cream)] px-6 py-5">
        <span className="font-sans text-xs tracking-[0.18em] text-[var(--sl-ink-soft)] uppercase">
          Estimated total
        </span>
        <div className="font-sans text-2xl tracking-[0.02em] text-[var(--sl-ink)] uppercase md:text-3xl">
          {formatPrice(estimatedTotal)}
        </div>
      </div>

      <div className="px-6 py-5">
        <Link
          href="/checkout"
          className="sl-btn flex w-full items-center justify-between"
        >
          <span>Proceed to Checkout</span>
          <span>→</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 px-6 pb-6">
        {REASSURANCE.map((note) => (
          <div key={note.icon} className="flex items-start gap-2.5">
            {/* N-1: decorative glyph */}
            <span
              aria-hidden="true"
              className="flex size-[22px] flex-shrink-0 items-center justify-center rounded-sm bg-[var(--sl-cream)] font-sans text-xs text-[var(--sl-coral)]"
            >
              {note.icon}
            </span>
            <p className="font-sans text-xs leading-relaxed tracking-[0.08em] text-[var(--sl-ink-soft)] uppercase">
              {note.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
