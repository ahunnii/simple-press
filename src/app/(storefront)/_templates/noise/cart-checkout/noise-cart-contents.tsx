"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import { shippingConfigFromBusiness } from "~/lib/shipping-utils";
import {
  getAmountUntilFreeShipping,
  getFreeShippingProgress,
  SHIPPING_TYPES,
} from "~/lib/shipping-utils";
import { formatPrice } from "~/lib/prices";
import { FadeIn, PageTransition } from "~/components/page-animations";
import { useCart } from "~/providers/cart-context";

import { NoiseCartItem } from "./noise-cart-item";
import { NoiseCartSummary } from "./noise-cart-summary";

const CHECKOUT_STEPS = [
  { n: "01", label: "The Bag" },
  { n: "02", label: "Ship to" },
  { n: "03", label: "Pay" },
  { n: "04", label: "Confirm" },
] as const;

type Props = {
  business: {
    id: string;
    shippingType: string;
    shippingFlatRate: number | null;
    freeShippingThreshold: number | null;
    offersInStorePickup: boolean;
    siteContent: { primaryColor: string | null } | null;
  };
};

export function NoiseCartContents({ business }: Props) {
  const { items, subtotal } = useCart();
  const shippingConfig = shippingConfigFromBusiness(business);
  const untilFree = getAmountUntilFreeShipping(subtotal, shippingConfig);
  const progress = getFreeShippingProgress(subtotal, shippingConfig);
  const hasFreeBar =
    shippingConfig.shippingType === SHIPPING_TYPES.FLAT_RATE_WITH_THRESHOLD &&
    progress !== null &&
    untilFree !== null;

  /* Empty state */
  if (items.length === 0) {
    return (
      <PageTransition>
        <section
          className="flex flex-col items-center justify-center px-7 py-32 text-center border-b-2 border-foreground"
          style={{ background: "var(--vn-paper)" }}
        >
          <FadeIn direction="up" className="flex flex-col items-center gap-6">
            <div
              className="flex items-center justify-center border-2 border-foreground"
              style={{ width: "72px", height: "72px" }}
            >
              <ShoppingBag className="size-7" style={{ color: "var(--vn-steel-mist)" }} />
            </div>
            <div>
              <h1
                className="font-serif italic leading-none"
                style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", letterSpacing: "-0.02em" }}
              >
                The bag is empty.
              </h1>
              <p
                className="mt-3 font-sans text-sm max-w-xs mx-auto"
                style={{ color: "var(--vn-steel-mist)" }}
              >
                Browse the collection and add pieces you love.
              </p>
            </div>
            <Link
              href="/shop"
              className="vn-stamp vn-stamp-solid text-[10.5px] mt-2"
            >
              Shop the Collection →
            </Link>
          </FadeIn>
        </section>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      {/* Editorial two-column header */}
      <section
        className="border-b-2 border-foreground grid md:grid-cols-2"
        style={{ background: "var(--vn-paper)" }}
      >
        {/* Left — heading */}
        <FadeIn className="flex flex-col gap-5 px-7 py-12 border-b border-foreground md:border-b-0 md:border-r">
          <p
            className="font-mono text-[9.5px] tracking-[0.22em] uppercase"
            style={{ color: "var(--vn-steel)" }}
          >
            Section / 05 — Your bag, your transmission
          </p>
          <h1
            className="font-serif italic leading-none tracking-tight"
            style={{ fontSize: "clamp(3rem, 6vw, 5rem)", letterSpacing: "-0.025em" }}
          >
            The <em style={{ color: "var(--vn-steel)" }}>Bag.</em>
          </h1>
          <p
            className="font-sans text-[15px] leading-relaxed max-w-[40ch]"
            style={{ color: "var(--vn-ink-soft)" }}
          >
            {items.length} garment{items.length !== 1 ? "s" : ""} queued, hand-cut on
            Gratiot. Gift wrap is on the house, and we ship from Detroit within five
            working days.
          </p>
        </FadeIn>

        {/* Right — checkout progress + free shipping bar */}
        <FadeIn
          delay={0.1}
          className="flex flex-col justify-center gap-8 px-7 py-12"
          style={{ background: "var(--vn-bone)" }}
        >
          {/* Checkout steps */}
          <div>
            <h5
              className="font-mono text-[9px] tracking-[0.22em] uppercase mb-4"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              Checkout sequence
            </h5>
            <div className="flex items-center gap-0">
              {CHECKOUT_STEPS.map((step, i) => (
                <div key={step.n} className="flex items-center">
                  <div
                    className="flex items-center gap-2"
                    style={{ opacity: i === 0 ? 1 : 0.35 }}
                  >
                    <span
                      className="flex-shrink-0 flex items-center justify-center border font-mono text-[9px] tracking-[0.1em]"
                      style={{
                        width: "24px",
                        height: "24px",
                        background: i === 0 ? "var(--vn-ink)" : "transparent",
                        color: i === 0 ? "var(--vn-bone)" : "var(--vn-ink)",
                        borderColor: i === 0 ? "var(--vn-ink)" : "var(--vn-rule)",
                      }}
                    >
                      {step.n}
                    </span>
                    <span
                      className="font-mono text-[9.5px] tracking-[0.14em] uppercase whitespace-nowrap"
                      style={{ color: i === 0 ? "var(--vn-ink)" : "var(--vn-steel-mist)" }}
                    >
                      {step.label}
                    </span>
                  </div>
                  {i < CHECKOUT_STEPS.length - 1 && (
                    <span
                      className="mx-3 font-mono text-[10px]"
                      style={{ color: "var(--vn-rule)" }}
                    >
                      /
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Free shipping progress */}
          {hasFreeBar && untilFree !== null && progress !== null && untilFree > 0 && (
            <div>
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
                  {Math.round(progress * 100)}% there
                </span>
              </div>
              <div
                className="h-px w-full relative"
                style={{ background: "var(--vn-rule)" }}
              >
                <div
                  className="absolute inset-y-0 left-0 transition-all"
                  style={{
                    width: `${Math.min(100, Math.round(progress * 100))}%`,
                    background: "var(--vn-ink)",
                    height: "2px",
                    top: "-0.5px",
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
        </FadeIn>
      </section>

      {/* Main layout: items + sticky summary */}
      <div
        className="flex flex-col gap-0 lg:grid lg:grid-cols-[1fr_380px]"
        style={{ background: "var(--vn-paper)" }}
      >
        {/* Items column */}
        <div className="border-r border-foreground/15 px-7 py-8">
          {/* Table header — hidden on mobile, shown on sm+ */}
          <div
            className="hidden sm:grid items-center border-b-2 border-foreground pb-3 mb-0 gap-4"
            style={{
              gridTemplateColumns: "80px 1fr auto auto auto auto",
            }}
          >
            <span />
            <span
              className="font-mono text-[9.5px] tracking-[0.22em] uppercase"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              Garment
            </span>
            <span
              className="font-mono text-[9.5px] tracking-[0.22em] uppercase text-right"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              Unit
            </span>
            <span
              className="font-mono text-[9.5px] tracking-[0.22em] uppercase text-center"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              Qty
            </span>
            <span
              className="font-mono text-[9.5px] tracking-[0.22em] uppercase text-right"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              Total
            </span>
            <span />
          </div>

          {/* Items */}
          {items.map((item, i) => (
            <NoiseCartItem key={`${item.productId}-${item.variantId ?? "base"}`} item={item} index={i} />
          ))}

          {/* Continue shopping */}
          <div className="mt-6 flex items-center justify-between">
            <Link
              href="/shop"
              className="font-mono text-[10px] tracking-[0.22em] uppercase flex items-center gap-3 transition-opacity hover:opacity-60"
              style={{ color: "var(--vn-steel)" }}
            >
              ← Continue Shopping
            </Link>
            <span
              className="font-mono text-[9.5px] tracking-[0.14em] uppercase"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              {items.length} {items.length === 1 ? "piece" : "pieces"} in bag
            </span>
          </div>
        </div>

        {/* Sticky summary */}
        <div className="px-7 py-8 lg:px-6">
          <div className="sticky top-24">
            <NoiseCartSummary shippingConfig={shippingConfig} />
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
