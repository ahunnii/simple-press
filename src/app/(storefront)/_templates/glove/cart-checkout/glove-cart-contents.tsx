"use client";

import type { ShippingConfig } from "~/lib/shipping-utils";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { formatPrice } from "~/lib/prices";
import {
  calculateShipping,
  getAmountUntilFreeShipping,
  SHIPPING_TYPES,
} from "~/lib/shipping-utils";
import { cartItemId, useCart } from "~/providers/cart-context";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

import { GloveButton } from "../shared/glove-button";
import { GloveHandIcon } from "../shared/glove-hand-icon";
import { GloveMistPanel } from "../shared/glove-mist-panel";
import { groupGloveCartLines } from "./glove-cart-groups";
import { GloveCartRow } from "./glove-cart-row";

type GloveCartContentsProps = {
  /** Store shipping settings, for the estimate in the summary card. */
  shippingConfig: ShippingConfig;
  columnProduct: string;
  columnPrice: string;
  columnQuantity: string;
  columnSubtotal: string;
  continueLabel: string;
  totalsHeading: string;
  totalsNote: string;
  checkoutLabel: string;
  emptyHeading: string;
  emptyBody: string;
  emptyCta: string;
};

/**
 * Cart body: hydration skeleton, designed empty state, or the line-item list
 * beside the "Order summary" card. Everything here reads `useCart()`, which is
 * localStorage-only, so the first paint is a deliberate placeholder rather
 * than an empty state that flips to full.
 */
export function GloveCartContents({
  shippingConfig,
  columnProduct,
  columnPrice,
  columnQuantity,
  columnSubtotal,
  continueLabel,
  totalsHeading,
  totalsNote,
  checkoutLabel,
  emptyHeading,
  emptyBody,
  emptyCta,
}: GloveCartContentsProps) {
  const { items, subtotal, itemCount, isHydrated } = useCart();
  const { isEnabled } = useStorefrontFlags();
  const canShop = isEnabled("products");
  const canCheckout = isEnabled("checkout");

  // Zone + weight rates need a destination, which the cart doesn't have, so
  // that case defers to checkout rather than showing a misleading "Free".
  const isZoneWeight =
    shippingConfig.shippingType === SHIPPING_TYPES.ZONE_WEIGHT;
  const shipping = isZoneWeight
    ? 0
    : calculateShipping(subtotal, shippingConfig);
  const untilFree = getAmountUntilFreeShipping(subtotal, shippingConfig);

  if (!isHydrated) {
    return (
      <div
        aria-hidden="true"
        className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start"
      >
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((n) => (
            <div key={n} className="h-[118px] bg-[var(--glove-mist)]" />
          ))}
        </div>
        <div className="h-[260px] rounded-[var(--glove-radius-panel)] bg-[var(--glove-mist)]" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <GloveMistPanel className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-6 py-14 text-center md:py-20">
        <GloveHandIcon className="size-20 text-[var(--glove-primary)]" />
        <h2
          className="glove-display text-[24px] leading-tight font-medium text-[var(--glove-ink)] md:text-[30px]"
          {...fieldAttr("glove.cart.empty-heading")}
        >
          {emptyHeading}
        </h2>
        {emptyBody ? (
          <p
            className="max-w-md text-[16px] text-[var(--glove-text)]"
            {...fieldAttr("glove.cart.empty-body")}
          >
            {emptyBody}
          </p>
        ) : null}
        {canShop && emptyCta ? (
          <GloveButton href="/shop" variant="woo" className="mt-2">
            <span {...fieldAttr("glove.cart.empty-cta")}>{emptyCta}</span>
          </GloveButton>
        ) : null}
      </GloveMistPanel>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-12">
      <div className="min-w-0">
        {/* Compact total + checkout on phones, so they are reachable without
            scrolling past every line. Hidden from lg, where the summary card
            sits beside the list; a single item needs no repeat. */}
        {canCheckout && checkoutLabel && items.length > 1 ? (
          <div className="mb-2 flex items-center justify-between gap-4 rounded-[var(--glove-radius-card)] border border-[var(--glove-mist-line)] bg-[var(--glove-mist)] px-4 py-3 lg:hidden">
            <p className="m-0 flex flex-col">
              <span className="text-[13px] text-[var(--glove-muted)]">
                Estimated total
              </span>
              <span className="glove-body text-[20px] leading-tight font-bold text-[var(--glove-primary)]">
                {formatPrice(subtotal + shipping)}
              </span>
            </p>
            <GloveButton href="/checkout" variant="woo">
              <span {...fieldAttr("glove.cart.checkout-label")}>
                {checkoutLabel}
              </span>
            </GloveButton>
          </div>
        ) : null}

        <h2 className="sr-only" {...fieldAttr("glove.cart.column-product")}>
          {columnProduct}
        </h2>
        <ul className="m-0 list-none p-0">
          {groupGloveCartLines(items).map(({ item, addOns, total }) => (
            <GloveCartRow
              key={cartItemId(item)}
              item={item}
              addOns={addOns}
              groupTotal={total}
              labels={{
                price: columnPrice,
                quantity: columnQuantity,
                subtotal: columnSubtotal,
              }}
            />
          ))}
        </ul>

        <p className="sr-only" role="status" aria-live="polite">
          {itemCount === 1 ? "1 item" : `${itemCount} items`} in your bag,
          subtotal {formatPrice(subtotal)}
        </p>

        {canShop && continueLabel ? (
          <div className="mt-6">
            <GloveButton href="/shop" variant="wooOutline">
              <span {...fieldAttr("glove.cart.continue-label")}>
                {continueLabel}
              </span>
            </GloveButton>
          </div>
        ) : null}
      </div>

      <GloveMistPanel as="aside" className="p-6 md:p-8 lg:sticky lg:top-6">
        <h2
          id="glove-cart-totals-heading"
          className="glove-display text-[22px] leading-tight font-medium text-[var(--glove-ink)]"
          {...fieldAttr("glove.cart.totals-heading")}
        >
          {totalsHeading}
        </h2>
        <dl
          aria-labelledby="glove-cart-totals-heading"
          className="m-0 mt-5 flex flex-col"
        >
          <div className="flex items-baseline justify-between gap-4 border-b border-[var(--glove-mist-line)] py-3">
            <dt className="glove-display text-[15px] font-medium text-[var(--glove-ink)]">
              {columnSubtotal}
            </dt>
            <dd className="glove-body m-0 text-[16px] font-bold text-[var(--glove-ink)]">
              {formatPrice(subtotal)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-b border-[var(--glove-mist-line)] py-3">
            <dt className="glove-display text-[15px] font-medium text-[var(--glove-ink)]">
              Shipping
            </dt>
            <dd className="glove-body m-0 text-right text-[16px] font-bold text-[var(--glove-ink)]">
              {isZoneWeight ? (
                <span className="text-[14px] font-normal text-[var(--glove-muted)]">
                  Calculated at checkout
                </span>
              ) : shipping === 0 ? (
                "Free"
              ) : (
                formatPrice(shipping)
              )}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 py-4">
            <dt className="glove-display text-[15px] font-medium text-[var(--glove-ink)]">
              Estimated total
            </dt>
            <dd className="glove-body m-0 text-[24px] font-bold text-[var(--glove-primary)]">
              {formatPrice(subtotal + shipping)}
            </dd>
          </div>
        </dl>
        {untilFree !== null ? (
          <p className="mt-1 text-[13px] leading-relaxed font-bold text-[var(--glove-primary)]">
            Add {formatPrice(untilFree)} more for free shipping.
          </p>
        ) : null}
        {totalsNote ? (
          <p
            className="mt-1 text-[13px] leading-relaxed text-[var(--glove-muted)]"
            {...fieldAttr("glove.cart.totals-note")}
          >
            {totalsNote}
          </p>
        ) : null}
        {canCheckout && checkoutLabel ? (
          <GloveButton
            href="/checkout"
            variant="woo"
            fullWidth
            className="mt-6"
          >
            <span {...fieldAttr("glove.cart.checkout-label")}>
              {checkoutLabel}
            </span>
          </GloveButton>
        ) : null}
      </GloveMistPanel>
    </div>
  );
}
