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
      className="overflow-hidden rounded-sm bg-white"
      style={{ boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)" }}
    >
      <div className="border-b px-6 pt-6 pb-4" style={{ borderColor: "#e8e8e8" }}>
        <h3
          className="uppercase"
          style={{
            fontSize: "clamp(1.25rem, 3vw, 1.75rem)",
            color: "var(--sl-coral)",
            letterSpacing: "0.04em",
            lineHeight: 1,
          }}
        >
          Order Summary
        </h3>
      </div>

      <div
        className="flex flex-col gap-3 border-b px-6 py-5"
        style={{ borderColor: "#e8e8e8" }}
      >
        <div className="flex items-baseline justify-between">
          <span
            className="font-sans text-xs tracking-[0.14em] uppercase"
            style={{ color: "var(--sl-ink-soft)" }}
          >
            Subtotal — {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
          <span
            className="font-sans text-sm tracking-[0.04em]"
            style={{ color: "var(--sl-ink)" }}
          >
            {formatPrice(subtotal)}
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span
            className="font-sans text-xs tracking-[0.14em] uppercase"
            style={{ color: "var(--sl-ink-soft)" }}
          >
            Est. shipping
          </span>
          <span
            className="font-sans text-sm tracking-[0.04em]"
            style={{ color: "var(--sl-ink)" }}
          >
            {shipping === 0 ? (
              <span style={{ color: "var(--sl-ink-soft)" }}>Free</span>
            ) : (
              formatPrice(shipping)
            )}
          </span>
        </div>
      </div>

      {showFreeBar && untilFree !== null && progress !== null && (
        <div
          className="border-b px-6 py-4"
          style={{ borderColor: "#e8e8e8" }}
        >
          <div className="mb-2 flex justify-between">
            <span
              className="font-sans text-xs tracking-[0.12em] uppercase"
              style={{ color: "var(--sl-ink-soft)" }}
            >
              Free shipping at{" "}
              {shippingConfig.freeShippingThreshold
                ? formatPrice(shippingConfig.freeShippingThreshold)
                : ""}
            </span>
            <span
              className="font-sans text-xs tracking-[0.12em] uppercase"
              style={{ color: "var(--sl-ink-soft)" }}
            >
              {Math.round(progress * 100)}%
            </span>
          </div>
          <div
            className="relative h-1.5 w-full overflow-hidden rounded-full"
            style={{ background: "var(--sl-cream)" }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all"
              style={{
                width: `${Math.min(100, Math.round(progress * 100))}%`,
                background: "var(--sl-coral)",
              }}
            />
          </div>
          <p
            className="mt-2 font-sans text-xs tracking-[0.12em] uppercase"
            style={{ color: "var(--sl-ink-soft)" }}
          >
            {formatPrice(untilFree)} to go
          </p>
        </div>
      )}

      <div
        className="flex items-baseline justify-between border-b px-6 py-5"
        style={{ borderColor: "#e8e8e8", background: "var(--sl-cream)" }}
      >
        <span
          className="font-sans text-xs tracking-[0.18em] uppercase"
          style={{ color: "var(--sl-ink-soft)" }}
        >
          Estimated total
        </span>
        <div
          className="font-sans text-2xl tracking-[0.02em] uppercase md:text-3xl"
          style={{ color: "var(--sl-ink)" }}
        >
          {formatPrice(estimatedTotal)}
        </div>
      </div>

      <div className="px-6 py-5" style={{ borderColor: "#e8e8e8" }}>
        <Link
          href="/checkout"
          onClick={() => setIsOpen(false)}
          className="sl-btn flex w-full items-center justify-between"
        >
          <span>Proceed to Checkout</span>
          <span>→</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 px-6 pb-6">
        {REASSURANCE.map((note) => (
          <div key={note.icon} className="flex items-start gap-2.5">
            <span
              className="flex flex-shrink-0 items-center justify-center rounded-sm font-sans text-xs"
              style={{
                width: "22px",
                height: "22px",
                background: "var(--sl-cream)",
                color: "var(--sl-coral)",
              }}
            >
              {note.icon}
            </span>
            <p
              className="font-sans text-xs leading-relaxed tracking-[0.08em] uppercase"
              style={{ color: "var(--sl-ink-soft)" }}
            >
              {note.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
