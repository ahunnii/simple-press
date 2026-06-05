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

  if (items.length === 0) {
    return (
      <PageTransition>
        <section
          className="flex flex-col items-center justify-center px-7 py-32 text-center"
          style={{ background: "#ffffff" }}
        >
          <FadeIn direction="up" className="flex flex-col items-center gap-6">
            <div
              className="flex items-center justify-center rounded-sm"
              style={{
                width: "72px",
                height: "72px",
                background: "var(--sl-cream)",
                color: "var(--sl-coral)",
              }}
            >
              <ShoppingBag className="size-7" />
            </div>
            <div>
              <h1
                className="uppercase"
                style={{
                  fontSize: "clamp(2rem, 5vw, 3rem)",
                  color: "var(--sl-coral)",
                  letterSpacing: "0.04em",
                  lineHeight: 1,
                }}
              >
                Your bag is empty
              </h1>
              <p
                className="mx-auto mt-3 max-w-xs font-sans text-sm leading-relaxed"
                style={{ color: "var(--sl-ink-soft)" }}
              >
                Browse the shop and add pieces you love.
              </p>
            </div>
            <Link href="/shop" className="sl-btn mt-2 text-xs">
              Browse Shop →
            </Link>
          </FadeIn>
        </section>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <section
        className="px-7 pt-16 pb-10 md:pt-20 md:pb-12"
        style={{ background: "#ffffff" }}
      >
        <FadeIn style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <h1
            className="uppercase"
            style={{
              fontSize: "clamp(2.5rem, 6vw, 4rem)",
              color: "var(--sl-coral)",
              letterSpacing: "0.04em",
              lineHeight: 1,
            }}
          >
            Your Cart
          </h1>
          <p
            className="mt-4 font-sans text-sm leading-relaxed md:text-base"
            style={{ color: "var(--sl-ink-soft)" }}
          >
            {items.length} {items.length === 1 ? "item" : "items"} ready to
            checkout.
          </p>

          {hasFreeBar && untilFree !== null && progress !== null && untilFree > 0 && (
            <div className="mt-8" style={{ maxWidth: "480px" }}>
              <div className="mb-2 flex justify-between">
                <span
                  className="font-sans text-xs tracking-[0.14em] uppercase"
                  style={{ color: "var(--sl-ink-soft)" }}
                >
                  {formatPrice(untilFree)} to free shipping
                </span>
                <span
                  className="font-sans text-xs tracking-[0.14em] uppercase"
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
            </div>
          )}
        </FadeIn>
      </section>

      <div
        className="flex flex-col gap-0 lg:grid lg:grid-cols-[1fr_380px]"
        style={{ background: "#ffffff" }}
      >
        <div
          className="px-7 py-8 lg:border-r"
          style={{ borderColor: "#e8e8e8" }}
        >
          <div
            className="mb-0 hidden items-center gap-4 border-b pb-3 sm:grid"
            style={{
              gridTemplateColumns: "80px 1fr auto auto auto auto",
              borderColor: "#e8e8e8",
            }}
          >
            <span />
            <span
              className="font-sans text-xs tracking-[0.18em] uppercase"
              style={{ color: "var(--sl-ink-soft)" }}
            >
              Item
            </span>
            <span
              className="text-right font-sans text-xs tracking-[0.18em] uppercase"
              style={{ color: "var(--sl-ink-soft)" }}
            >
              Price
            </span>
            <span
              className="text-center font-sans text-xs tracking-[0.18em] uppercase"
              style={{ color: "var(--sl-ink-soft)" }}
            >
              Qty
            </span>
            <span
              className="text-right font-sans text-xs tracking-[0.18em] uppercase"
              style={{ color: "var(--sl-ink-soft)" }}
            >
              Total
            </span>
            <span />
          </div>

          {items.map((item) => (
            <NoiseCartItem
              key={`${item.productId}-${item.variantId ?? "base"}`}
              item={item}
            />
          ))}

          <div className="mt-6 flex items-center justify-between">
            <Link
              href="/shop"
              className="flex items-center gap-3 font-sans text-xs tracking-[0.18em] uppercase transition-opacity hover:opacity-60"
              style={{ color: "var(--sl-ink)" }}
            >
              ← Continue Shopping
            </Link>
            <span
              className="font-sans text-xs tracking-[0.14em] uppercase"
              style={{ color: "var(--sl-ink-soft)" }}
            >
              {items.length} {items.length === 1 ? "item" : "items"}
            </span>
          </div>
        </div>

        <div className="px-7 py-8 lg:px-6" style={{ background: "var(--sl-cream)" }}>
          <div className="sticky top-24">
            <NoiseCartSummary shippingConfig={shippingConfig} />
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
