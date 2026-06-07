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
  const shipping = calculateShipping(subtotal, shippingConfig);
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
      <div className="px-6 pt-6 pb-4 border-b border-foreground/15">
        <h3
          className="font-serif italic leading-none tracking-tight"
          style={{ fontSize: "clamp(22px, 5vw, 28px)", letterSpacing: "-0.02em" }}
        >
          Total transmission.
        </h3>
      </div>

      {/* Line items */}
      <div className="px-6 py-5 flex flex-col gap-3 border-b border-foreground/15">
        <div className="flex justify-between items-baseline">
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
        <div className="flex justify-between items-baseline">
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
        <div className="flex justify-between items-baseline">
          <span
            className="font-mono text-[10.5px] tracking-[0.14em] uppercase"
            style={{ color: "var(--vn-steel)" }}
          >
            Est. shipping
          </span>
          <span className="font-mono text-[12px] tracking-[0.06em]">
            {shipping === 0 ? (
              <span style={{ color: "var(--vn-steel-mist)" }}>Free</span>
            ) : (
              formatPrice(shipping)
            )}
          </span>
        </div>
      </div>

      {/* Free shipping progress bar */}
      {showFreeBar && untilFree !== null && progress !== null && (
        <div className="px-6 py-4 border-b border-foreground/15">
          <div className="flex justify-between mb-2">
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
            className="h-px w-full relative"
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
        className="px-6 pt-4 pb-5 flex justify-between items-baseline border-b-2 border-foreground"
        style={{ background: "var(--vn-bone)" }}
      >
        <span
          className="font-mono text-[10.5px] tracking-[0.22em] uppercase"
          style={{ color: "var(--vn-steel)" }}
        >
          Grand total
        </span>
        <div
          className="font-serif italic leading-none"
          style={{ fontSize: "clamp(36px, 8vw, 48px)", letterSpacing: "-0.03em" }}
        >
          {formatPrice(estimatedTotal)}
        </div>
      </div>

      {/* Checkout button */}
      <div className="px-6 py-5 border-b border-foreground/15">
        <Link
          href="/checkout"
          onClick={() => setIsOpen(false)}
          className="flex items-center justify-between w-full px-5 py-4 font-mono text-[11px] tracking-[0.24em] uppercase transition-all hover:opacity-80"
          style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
        >
          <span>Proceed to checkout</span>
          <span>→</span>
        </Link>
      </div>

      {/* Payment method pills */}
      <div className="px-6 py-4 border-b border-foreground/15 flex flex-wrap gap-2">
        {["Visa", "Mastercard", "Amex", "Apple Pay", "PayPal"].map((m) => (
          <span
            key={m}
            className="font-mono text-[9px] tracking-[0.16em] uppercase px-2 py-1 border"
            style={{ borderColor: "var(--vn-rule)", color: "var(--vn-steel-mist)" }}
          >
            {m}
          </span>
        ))}
      </div>

      {/* Reassurance notes */}
      <div className="px-6 py-5 grid grid-cols-1 gap-3">
        {REASSURANCE.map((note) => (
          <div key={note.icon} className="flex gap-2.5 items-start">
            <span
              aria-hidden="true"
              className="flex-shrink-0 flex items-center justify-center border font-serif italic"
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
              className="font-mono text-[9.5px] tracking-[0.14em] uppercase leading-relaxed"
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
