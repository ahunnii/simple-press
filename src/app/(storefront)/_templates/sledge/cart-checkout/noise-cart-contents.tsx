"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import { formatPrice } from "~/lib/prices";
import {
  getAmountUntilFreeShipping,
  getFreeShippingProgress,
  SHIPPING_TYPES,
  shippingConfigFromBusiness,
} from "~/lib/shipping-utils";
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
      <PageTransition className="bg-white">
        <section className="flex flex-col items-center justify-center px-7 py-32 text-center">
          <FadeIn direction="up" className="flex flex-col items-center gap-6">
            <div className="flex size-[72px] items-center justify-center rounded-sm bg-[var(--sl-cream)] text-[var(--sl-coral)]">
              <ShoppingBag className="size-7" />
            </div>
            <div>
              <h1 className="sl-page-title-md uppercase text-[var(--sl-coral)]">
                Your bag is empty
              </h1>
              <p className="sl-eyebrow mx-auto mt-3 max-w-xs font-sans text-sm leading-relaxed">
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
      <section className="bg-white pt-16 pb-10 md:pt-20 md:pb-12">
        <FadeIn className="mx-auto w-full max-w-7xl">
          <h1 className="sl-page-title-checkout uppercase">Your Cart</h1>
          <p className="sl-eyebrow mt-4 font-sans text-sm leading-relaxed md:text-base">
            {items.length} {items.length === 1 ? "item" : "items"} ready to
            checkout.
          </p>

          {hasFreeBar &&
            untilFree !== null &&
            progress !== null &&
            untilFree > 0 && (
              <div className="mt-8 max-w-[480px]">
                <div className="mb-2 flex justify-between">
                  <span className="sl-eyebrow font-sans text-xs tracking-[0.14em] uppercase">
                    {formatPrice(untilFree)} to free shipping
                  </span>
                  <span className="sl-eyebrow font-sans text-xs tracking-[0.14em] uppercase">
                    {Math.round(progress * 100)}%
                  </span>
                </div>
                <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--sl-cream)]">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-[var(--sl-coral)] transition-all"
                    style={{
                      width: `${Math.min(100, Math.round(progress * 100))}%`,
                    }}
                  />
                </div>
              </div>
            )}
        </FadeIn>
      </section>

      <div className="mx-auto flex max-w-7xl flex-col gap-0 bg-white lg:grid lg:grid-cols-[1fr_380px]">
        <div className="border-[var(--sl-border)] px-7 py-8 lg:border-r">
          <div className="sl-cart-item-grid mb-0 hidden items-center gap-4 border-b border-[var(--sl-border)] pb-3 sm:grid">
            <span />
            <span className="sl-eyebrow font-sans text-xs tracking-[0.18em] uppercase">
              Item
            </span>
            <span className="sl-eyebrow text-right font-sans text-xs tracking-[0.18em] uppercase">
              Price
            </span>
            <span className="sl-eyebrow text-center font-sans text-xs tracking-[0.18em] uppercase">
              Qty
            </span>
            <span className="sl-eyebrow text-right font-sans text-xs tracking-[0.18em] uppercase">
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
              className="flex items-center gap-3 font-sans text-xs tracking-[0.18em] text-[var(--sl-ink)] uppercase transition-opacity hover:opacity-60"
            >
              ← Continue Shopping
            </Link>
            <span className="sl-eyebrow font-sans text-xs tracking-[0.14em] uppercase">
              {items.length} {items.length === 1 ? "item" : "items"}
            </span>
          </div>
        </div>

        <div className="px-7 py-8 lg:px-6">
          <div className="sticky top-24">
            <NoiseCartSummary shippingConfig={shippingConfig} />
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
