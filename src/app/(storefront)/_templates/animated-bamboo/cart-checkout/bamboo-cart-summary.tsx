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
import { cn } from "~/lib/utils";
import { Progress } from "~/components/ui/progress";
import { useCart } from "~/providers/cart-context";

import { BambooGlyph } from "../shared/bamboo-glyph";

type CartSummaryProps = {
  shippingConfig: ShippingConfig;
};

/** Same dash rhythm as `.bamboo-torn-card::before` in globals.css. */
const PERFORATION_RULE: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(90deg, color-mix(in srgb, var(--bamboo-core-tan) 55%, transparent) 0 7px, transparent 7px 15px)",
};

export function BambooCartSummary({ shippingConfig }: CartSummaryProps) {
  const { subtotal, itemCount } = useCart();
  // Zone+weight rates depend on the destination address, which isn't known in
  // the cart — defer to checkout rather than showing a misleading "Free".
  const isZoneWeight =
    shippingConfig.shippingType === SHIPPING_TYPES.ZONE_WEIGHT;
  const shipping = isZoneWeight
    ? 0
    : calculateShipping(subtotal, shippingConfig);
  const estimatedOrderTotal = subtotal + shipping;
  const untilFree = getAmountUntilFreeShipping(subtotal, shippingConfig);
  const progress = getFreeShippingProgress(subtotal, shippingConfig);
  const showProgress =
    shippingConfig.shippingType === SHIPPING_TYPES.FLAT_RATE_WITH_THRESHOLD &&
    progress !== null &&
    untilFree !== null;
  return (
    <div className="bamboo-torn-card">
      {/* Pine accent: the wreath mark sitting beside the summary heading. */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-xl font-semibold text-[var(--bamboo-pine)]">
          Order Summary
        </h2>
        <BambooGlyph id="s-wreath" className="w-[40px] shrink-0 opacity-80" />
      </div>
      <div className="mt-5 flex flex-col gap-3">
        <div className="flex justify-between text-[0.95rem]">
          <span className="text-[var(--bamboo-ink-soft)]">
            Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})
          </span>
          <span className="font-medium text-[var(--bamboo-ink)]">
            {formatPrice(subtotal)}
          </span>
        </div>
        <div className="flex justify-between text-[0.95rem]">
          <span className="text-[var(--bamboo-ink-soft)]">Shipping</span>
          <span className="font-medium text-[var(--bamboo-ink)]">
            {isZoneWeight
              ? "Calculated at checkout"
              : shipping === 0
                ? "Free"
                : formatPrice(shipping)}
          </span>
        </div>
        {showProgress && untilFree !== null && (
          <div className="space-y-2">
            <Progress
              value={progress * 100}
              className="h-2 bg-[var(--bamboo-sage)]"
              aria-label={`Free shipping progress: ${Math.round(progress * 100)}% of the way there`}
            />
            <p className="text-xs text-[var(--bamboo-muted)]">
              Add {formatPrice(untilFree)} more for free shipping
            </p>
          </div>
        )}
        {shipping > 0 &&
          shippingConfig.shippingType === SHIPPING_TYPES.FLAT_RATE && (
            <p className="text-xs text-[var(--bamboo-muted)]">
              Flat rate shipping on all orders
            </p>
          )}
        {/* Perforated rule — the roll-paper tear line, not a generic divider.
            Inline because `color-mix()` must never live in a Tailwind
            arbitrary value (F1 build-report convention). */}
        <div
          aria-hidden="true"
          className="my-1 h-[3px] rounded-sm"
          style={PERFORATION_RULE}
        />
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-heading font-semibold text-[var(--bamboo-pine)]">
            Estimated Total
          </span>
          <span className="bamboo-price">
            {formatPrice(estimatedOrderTotal)}
          </span>
        </div>
      </div>
      <Link
        href="/checkout"
        className={cn(
          "bamboo-btn",
          "bamboo-btn-primary",
          "mt-7 w-full justify-center",
        )}
      >
        Proceed to Checkout
      </Link>
    </div>
  );
}
