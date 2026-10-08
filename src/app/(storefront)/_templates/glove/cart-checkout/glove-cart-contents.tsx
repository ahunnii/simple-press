"use client";

import type { ShippingConfig } from "~/lib/shipping-utils";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { formatPrice } from "~/lib/prices";
import {
  calculateShipping,
  getAmountUntilFreeShipping,
  SHIPPING_TYPES,
} from "~/lib/shipping-utils";
import { useCart } from "~/providers/cart-context";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

import { GloveButton } from "../shared/glove-button";
import { GloveHandIcon } from "../shared/glove-hand-icon";
import { GloveMistPanel } from "../shared/glove-mist-panel";
import { GLOVE_CART_GRID, GloveCartRow } from "./glove-cart-row";

type GloveCartContentsProps = {
  /** Store shipping settings, for the estimate in the totals card. */
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
 * Cart body: hydration skeleton, designed empty state, or the line-item table
 * beside the "Cart totals" card. Everything here reads `useCart()`, which is
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
            <div key={n} className="h-[118px] bg-[var(--glove-cloud)]" />
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
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-12">
      <div className="min-w-0">
        {/* Column headings: desktop only; mobile rows carry their own labels. */}
        <div
          aria-hidden="true"
          className={`glove-display hidden items-center gap-x-4 border-b-2 border-[var(--glove-ink)] pb-3 text-[13px] font-semibold tracking-[0.05em] text-[var(--glove-ink)] uppercase md:grid ${GLOVE_CART_GRID}`}
        >
          <span className="col-span-2">
            <span {...fieldAttr("glove.cart.column-product")}>
              {columnProduct}
            </span>
          </span>
          <span className="text-center">
            <span {...fieldAttr("glove.cart.column-price")}>{columnPrice}</span>
          </span>
          <span className="text-center">
            <span {...fieldAttr("glove.cart.column-quantity")}>
              {columnQuantity}
            </span>
          </span>
          <span className="text-center">
            <span {...fieldAttr("glove.cart.column-subtotal")}>
              {columnSubtotal}
            </span>
          </span>
          <span />
        </div>

        <ul className="m-0 list-none p-0">
          {items.map((item) => (
            <GloveCartRow
              key={`${item.productId}-${item.variantId ?? "base"}`}
              item={item}
              labels={{
                price: columnPrice,
                quantity: columnQuantity,
                subtotal: columnSubtotal,
              }}
            />
          ))}
        </ul>

        <p className="sr-only" role="status" aria-live="polite">
          {itemCount === 1 ? "1 item" : `${itemCount} items`} in your cart,
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
            <dt className="glove-display text-[13px] font-semibold tracking-[0.05em] text-[var(--glove-ink)] uppercase">
              {columnSubtotal}
            </dt>
            <dd className="glove-body m-0 text-[16px] font-bold text-[var(--glove-ink)]">
              {formatPrice(subtotal)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-b border-[var(--glove-mist-line)] py-3">
            <dt className="glove-display text-[13px] font-semibold tracking-[0.05em] text-[var(--glove-ink)] uppercase">
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
            <dt className="glove-display text-[13px] font-semibold tracking-[0.05em] text-[var(--glove-ink)] uppercase">
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
