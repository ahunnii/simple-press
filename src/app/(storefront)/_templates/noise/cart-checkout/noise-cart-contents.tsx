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
      {/* ── Centered page header ── */}
      <section
        className="border-b border-foreground/15 px-6 pt-16 pb-12 text-center"
        style={{ background: "var(--vn-paper)" }}
      >
        <FadeIn className="mx-auto" style={{ maxWidth: "880px" }}>
          <p
            className="font-mono text-[10px] tracking-[0.28em] uppercase mb-4"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            Your Bag
          </p>
          <h1
            className="font-serif italic leading-none tracking-tight"
            style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)", letterSpacing: "-0.025em" }}
          >
            {items.length} {items.length === 1 ? "piece" : "pieces"} ready.
          </h1>

          {/* Free shipping progress */}
          {hasFreeBar && untilFree !== null && progress !== null && untilFree > 0 && (
            <div className="mt-8 mx-auto" style={{ maxWidth: "480px" }}>
              <div className="flex justify-between mb-2">
                <span className="font-mono text-[9.5px] tracking-[0.14em] uppercase" style={{ color: "var(--vn-steel-mist)" }}>
                  {formatPrice(untilFree)} to free shipping
                </span>
                <span className="font-mono text-[9.5px] tracking-[0.14em] uppercase" style={{ color: "var(--vn-steel-mist)" }}>
                  {Math.round(progress * 100)}%
                </span>
              </div>
              <div className="h-px w-full relative" style={{ background: "var(--vn-rule)" }}>
                <div
                  className="absolute inset-y-0 left-0 transition-all"
                  style={{
                    width: `${Math.min(100, Math.round(progress * 100))}%`,
                    background: "var(--vn-ink)",
                    height: "1px",
                  }}
                />
              </div>
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
