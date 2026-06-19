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
  { icon: "✱", text: "Carefully packed and hand-finished" },
  { icon: "↺", text: "14-day exchange policy" },
  { icon: "✦", text: "Ships within five working days" },
] as const;

type Props = {
  shippingConfig: ShippingConfig;
};

export function NoiseCartSummary({ shippingConfig }: Props) {
  const { subtotal, itemCount, setIsOpen } = useCart();
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
    <div
      className="flex flex-col gap-0"
      style={{ background: "var(--vn-paper)" }}
    >
      {/* Heading */}
      <div className="border-foreground/15 border-b px-6 pt-6 pb-4">
        <h3
          className="font-serif leading-none tracking-tight italic"
          style={{
            fontSize: "clamp(22px, 5vw, 28px)",
            letterSpacing: "-0.02em",
          }}
        >
          Total transmission.
        </h3>
      </div>

      {/* Line items */}
      <div className="border-foreground/15 flex flex-col gap-3 border-b px-6 py-5">
        <div className="flex items-baseline justify-between">
          <span
            className="font-mono text-[10.5px] tracking-[0.14em] uppercase"
            style={{ color: "var(--vn-steel)" }}
          >
            Subtotal — {itemCount} {itemCount === 1 ? "piece" : "pieces"}
          </span>
          <span className="font-mono text-[12px] tracking-[0.06em]">
            {formatPrice(subtotal)}
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span
            className="font-mono text-[10.5px] tracking-[0.14em] uppercase"
            style={{ color: "var(--vn-steel)" }}
          >
            Gift wrap
          </span>
          <span
            className="font-mono text-[12px] tracking-[0.06em]"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            Free
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span
            className="font-mono text-[10.5px] tracking-[0.14em] uppercase"
            style={{ color: "var(--vn-steel)" }}
          >
            Est. shipping
          </span>
          <span className="font-mono text-[12px] tracking-[0.06em]">
            {isZoneWeight ? (
              <span style={{ color: "var(--vn-steel-mist)" }}>Calculated at checkout</span>
            ) : shipping === 0 ? (
              <span style={{ color: "var(--vn-steel-mist)" }}>Free</span>
            ) : (
              formatPrice(shipping)
            )}
          </span>
        </div>
      </div>

      {/* Free shipping progress bar */}
      {showFreeBar && untilFree !== null && progress !== null && (
        <div className="border-foreground/15 border-b px-6 py-4">
          <div className="mb-2 flex justify-between">
            <span
              className="font-mono text-[9.5px] tracking-[0.14em] uppercase"
              style={{ color: "var(--vn-steel)" }}
            >
              Free shipping unlocks at{" "}
              {shippingConfig.freeShippingThreshold
                ? formatPrice(shippingConfig.freeShippingThreshold)
                : ""}
            </span>
            <span
              className="font-mono text-[9.5px] tracking-[0.14em] uppercase"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              {Math.round(progress * 100)}%
            </span>
          </div>
          {/* Progress bar — ink fill on bone bg */}
          <div
            aria-hidden="true"
            className="relative h-px w-full"
            style={{ background: "var(--vn-rule)" }}
          >
            <div
              className="absolute inset-y-0 left-0 transition-all"
              style={{
                width: `${Math.min(100, Math.round(progress * 100))}%`,
                background: "var(--vn-ink)",
                height: "1px",
              }}
            />
          </div>
          <p
            className="mt-2 font-mono text-[9.5px] tracking-[0.14em] uppercase"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            {formatPrice(untilFree)} to go
          </p>
        </div>
      )}

      {/* Grand total */}
      <div
        className="border-foreground flex items-baseline justify-between border-b-2 px-6 pt-4 pb-5"
        style={{ background: "var(--vn-bone)" }}
      >
        <span
          className="font-mono text-[10.5px] tracking-[0.22em] uppercase"
          style={{ color: "var(--vn-steel)" }}
        >
          Grand total
        </span>
        <div
          className="font-serif leading-none italic"
          style={{
            fontSize: "clamp(36px, 8vw, 48px)",
            letterSpacing: "-0.03em",
          }}
        >
          {formatPrice(estimatedTotal)}
        </div>
      </div>

      {/* Checkout button */}
      <div className="border-foreground/15 border-b px-6 py-5">
        <Link
          href="/checkout"
          onClick={() => setIsOpen(false)}
          className="flex w-full items-center justify-between px-5 py-4 font-mono text-[11px] tracking-[0.24em] uppercase transition-all hover:opacity-80"
          style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
        >
          <span>Proceed to checkout</span>
          <span>→</span>
        </Link>
      </div>

      {/* Payment method pills */}
      <div className="border-foreground/15 flex flex-wrap gap-2 border-b px-6 py-4">
        {["Visa", "Mastercard", "Amex", "Apple Pay", "PayPal"].map((m) => (
          <span
            key={m}
            className="border px-2 py-1 font-mono text-[9px] tracking-[0.16em] uppercase"
            style={{
              borderColor: "var(--vn-rule)",
              color: "var(--vn-steel-mist)",
            }}
          >
            {m}
          </span>
        ))}
      </div>

      {/* Reassurance notes */}
      <div className="grid grid-cols-1 gap-3 px-6 py-5">
        {REASSURANCE.map((note) => (
          <div key={note.icon} className="flex items-start gap-2.5">
            <span
              aria-hidden="true"
              className="flex flex-shrink-0 items-center justify-center border font-serif italic"
              style={{
                width: "22px",
                height: "22px",
                borderColor: "var(--vn-ink)",
                fontSize: "13px",
                flexShrink: 0,
              }}
            >
              {note.icon}
            </span>
            <p
              className="font-mono text-[9.5px] leading-relaxed tracking-[0.14em] uppercase"
              style={{ color: "var(--vn-ink-soft)" }}
            >
              {note.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
