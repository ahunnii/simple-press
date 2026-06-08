"use client";

import Link from "next/link";

import { formatPrice } from "~/lib/prices";
import {
  getAmountUntilFreeShipping,
  getFreeShippingProgress,
  SHIPPING_TYPES,
  shippingConfigFromBusiness,
} from "~/lib/shipping-utils";
import { cn } from "~/lib/utils";
import { PageTransition } from "~/components/page-animations";
import { useCart } from "~/providers/cart-context";

import {
  SLEDGE_PAGE_CONTAINER,
  SLEDGE_PAGE_CONTENT_PADDING,
  SledgeEmptyState,
  SledgePageHeader,
} from "../shared/sledge-page-layout";
import { NoiseCartItem } from "./noise-cart-item";
import { SledgeCartSummary } from "./sledge-cart-summary";

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

export function SledgeCartContents({ business }: Props) {
  const { items, subtotal } = useCart();
  const shippingConfig = shippingConfigFromBusiness(business);
  const untilFree = getAmountUntilFreeShipping(subtotal, shippingConfig);
  const progress = getFreeShippingProgress(subtotal, shippingConfig);
  const hasFreeBar =
    shippingConfig.shippingType === SHIPPING_TYPES.FLAT_RATE_WITH_THRESHOLD &&
    progress !== null &&
    untilFree !== null &&
    untilFree > 0;

  const itemLabel = `${items.length} ${items.length === 1 ? "item" : "items"}`;

  if (items.length === 0) {
    return (
      <PageTransition>
        <SledgePageHeader title="Your Cart" />
        <div className={cn(SLEDGE_PAGE_CONTAINER, "pb-16 md:pb-20")}>
          <SledgeEmptyState
            bare
            className="py-20"
            message="Your bag is empty. Browse the shop and add pieces you love."
            action={
              <Link href="/shop" className="sl-btn text-xs">
                Browse Shop →
              </Link>
            }
          />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <SledgePageHeader
        title="Your Cart"
        intro={`${itemLabel} ready to checkout.`}
        meta={
          hasFreeBar && untilFree !== null && progress !== null ? (
            <div className="mt-6 max-w-md">
              <div className="mb-2 flex justify-between">
                <span className="sl-eyebrow font-sans text-xs tracking-[0.14em] uppercase">
                  {formatPrice(untilFree)} to free shipping
                </span>
                <span className="sl-eyebrow font-sans text-xs tracking-[0.14em] uppercase">
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
            </div>
          ) : undefined
        }
      />

      <section className={cn(SLEDGE_PAGE_CONTAINER, SLEDGE_PAGE_CONTENT_PADDING)}>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
          <div className="min-w-0">
            {/* M-4: visual column headers are decorative — sr-only labels in cells carry semantics */}
            <div
              aria-hidden="true"
              className="sl-cart-item-grid mb-0 hidden items-center gap-4 border-b border-[var(--sl-border)] pb-3 sm:grid"
            >
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

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <Link
                href="/shop"
                className="flex items-center gap-3 font-sans text-xs tracking-[0.18em] text-[var(--sl-ink)] uppercase transition-opacity hover:opacity-60"
              >
                ← Continue Shopping
              </Link>
              <span className="sl-eyebrow font-sans text-xs tracking-[0.14em] uppercase">
                {itemLabel}
              </span>
            </div>
          </div>

          <aside className="min-w-0">
            <div className="lg:sticky lg:top-28">
              <SledgeCartSummary shippingConfig={shippingConfig} />
            </div>
          </aside>
        </div>
      </section>
    </PageTransition>
  );
}
