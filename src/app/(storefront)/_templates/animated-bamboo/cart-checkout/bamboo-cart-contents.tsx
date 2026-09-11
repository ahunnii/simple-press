"use client";

import Link from "next/link";

import { shippingConfigFromBusiness } from "~/lib/shipping-utils";
import { cn } from "~/lib/utils";
import { useCart } from "~/providers/cart-context";

import { BambooGlyph } from "../shared/bamboo-glyph";
import { BambooReveal, BambooRevealGroup } from "../shared/bamboo-reveal";
import { BambooCartItem } from "./bamboo-cart-item";
import { BambooCartSummary } from "./bamboo-cart-summary";

type Props = {
  business: {
    id: string;
    shippingType: string;
    shippingFlatRate: number | null;
    freeShippingThreshold: number | null;
    offersInStorePickup: boolean;
    siteContent: {
      primaryColor: string | null;
    } | null;
  };
};

export function BambooCartContents({ business }: Props) {
  const { items, isHydrated } = useCart();
  const shippingConfig = shippingConfigFromBusiness(business);

  // Hydration guard — cart state loads from localStorage client-side, so the
  // very first render never knows the real item count. Render a neutral,
  // motionless placeholder until then rather than flashing empty→filled (or
  // filled→empty) on every load. `animate-pulse` is caught by the global
  // `.bamboo` reduced-motion rule (globals.css ~line 219), so no extra work
  // is needed for that.
  if (!isHydrated) {
    return (
      <section
        aria-hidden="true"
        className="mx-auto flex min-h-[calc(100svh-var(--bamboo-header-offset))] w-full max-w-7xl flex-col justify-center px-4 pt-10 pb-[12vh] lg:px-8"
      >
        <div className="mb-10 h-11 w-56 animate-pulse rounded-xl bg-[var(--bamboo-sage)]" />
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="flex flex-1 flex-col gap-4">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-[20px] bg-[var(--bamboo-roll)] ring-2 ring-[var(--bamboo-outline)]"
              />
            ))}
          </div>
          <div className="w-full shrink-0 lg:w-80">
            <div className="h-64 animate-pulse rounded-[20px] bg-[var(--bamboo-roll)] ring-2 ring-[var(--bamboo-outline)]" />
          </div>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="mx-auto flex min-h-[calc(100svh-var(--bamboo-header-offset))] w-full max-w-3xl flex-col items-center justify-center px-4 pt-10 pb-[12vh] text-center lg:px-8">
        <BambooReveal>
          {/* Illustrated roll — the empty cart's one decorative moment. */}
          <div className="relative mx-auto mb-8 w-[142px]">
            <BambooGlyph id="s-roll-front" className="w-full" />
            <span
              className="bamboo-shd"
              style={{ "--sw": "78%", "--sh": "12%" } as React.CSSProperties}
            />
          </div>
          <h1 className="font-heading text-[clamp(2rem,4vw,2.9rem)] leading-[1.08] font-bold tracking-tight text-[var(--bamboo-pine)]">
            Your cart is empty
          </h1>
          <p className="mx-auto mt-4 max-w-md text-[1.05rem] leading-relaxed text-[var(--bamboo-ink-soft)]">
            Nothing in it yet. Everything we make is luxuriously soft, tree-free
            bamboo paper, crafted in Detroit, Michigan.
          </p>
          <Link
            href="/shop"
            className={cn("bamboo-btn", "bamboo-btn-primary", "mt-9")}
          >
            Continue Shopping
          </Link>
        </BambooReveal>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-20">
      <BambooReveal>
        <div className="mb-10 flex items-end gap-4">
          <h1 className="font-heading text-[clamp(2.1rem,4.4vw,3.2rem)] leading-[1.06] font-bold tracking-tight text-[var(--bamboo-pine)]">
            Your Cart
          </h1>
          <BambooGlyph
            id="s-sprig"
            className="mb-2 hidden w-[58px] shrink-0 sm:block"
          />
        </div>
      </BambooReveal>

      <div className="flex flex-col gap-8 lg:flex-row">
        <BambooRevealGroup className="flex flex-1 flex-col gap-4">
          {items.map((item, i) => (
            <div
              key={item.productId}
              className="bamboo-reveal-item"
              style={{ "--i": i } as React.CSSProperties}
            >
              <BambooCartItem item={item} />
            </div>
          ))}
          <div
            className="bamboo-reveal-item mt-2"
            style={{ "--i": items.length } as React.CSSProperties}
          >
            <Link href="/shop" className={cn("bamboo-btn", "bamboo-btn-ghost")}>
              Continue Shopping
            </Link>
          </div>
        </BambooRevealGroup>

        <div className="w-full shrink-0 lg:w-80">
          <div className="sticky top-24">
            <BambooCartSummary shippingConfig={shippingConfig} />
          </div>
        </div>
      </div>
    </section>
  );
}
