"use client";

import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";

import type { ShippingConfig } from "~/lib/shipping-utils";
import type { CartItem } from "~/providers/cart-context";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { formatPrice } from "~/lib/prices";
import { calculateShipping, SHIPPING_TYPES } from "~/lib/shipping-utils";
import { useCart } from "~/providers/cart-context";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { navHrefFlag } from "~/app/(storefront)/_components/nav/nav-flags";

import { DreamButton } from "../shared/dream-button";
import { DreamEmptyPanel } from "../shop/dream-empty-panel";
import { DreamLineThumb } from "./dream-line-thumb";

/** Resolved `cart.*` copy — plain strings from the server page. */
export type DreamCartCopy = {
  summaryHeading: string;
  summaryNote: string;
  checkoutLabel: string;
  continueLabel: string;
  emptyHeading: string;
  emptyBody: string;
  emptyCtaLabel: string;
};

type Props = {
  copy: DreamCartCopy;
  shippingConfig: ShippingConfig;
};

/** Line label for the summary's shipping row, before an address is known. */
function shippingLabel(subtotal: number, config: ShippingConfig): string {
  if (config.shippingType === SHIPPING_TYPES.ZONE_WEIGHT) {
    return "Calculated at checkout";
  }
  const cost = calculateShipping(subtotal, config);
  return cost === 0 ? "Free" : formatPrice(cost);
}

function itemLabel(item: CartItem): string {
  return item.variantName
    ? `${item.productName} — ${item.variantName}`
    : item.productName;
}

/**
 * Cart line items + totals on dream's page system. All state comes from
 * the shared `useCart()` hook (quantity +/-, remove, subtotal) — totals
 * update in place without a reload (B7.2).
 *
 * Gating: the checkout button renders only while `checkout` is on (B7.4);
 * every link to `/shop` (keep-shopping link, empty-state button, product
 * names) is checked with `navHrefFlag` and hides while `products` is off —
 * never swapped for another destination.
 */
export function DreamCartContents({ copy, shippingConfig }: Props) {
  const {
    items,
    incrementItem,
    decrementItem,
    removeItem,
    subtotal,
    itemCount,
    isHydrated,
  } = useCart();
  const { isEnabled } = useStorefrontFlags();
  const checkoutEnabled = isEnabled("checkout");
  const shopFlag = navHrefFlag("/shop");
  const shopEnabled = shopFlag === null || isEnabled(shopFlag);

  // Hold the space (no empty → filled flash) while the cart loads from
  // localStorage.
  if (!isHydrated) {
    return (
      <div aria-busy="true" className="min-h-[320px]">
        <span className="sr-only" role="status">
          Loading your cart…
        </span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <DreamEmptyPanel
        heading={copy.emptyHeading}
        body={copy.emptyBody}
        ctaLabel={copy.emptyCtaLabel}
        ctaHref="/shop"
        headingFieldKey="dream.cart.empty-heading"
        bodyFieldKey="dream.cart.empty-body"
        ctaLabelFieldKey="dream.cart.empty-cta-label"
        sectionAttrs={sectionGroupAttr("cart", "empty")}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
      {/* Line items */}
      <div className="min-w-0">
        <h2 className="sr-only">Items in your cart</h2>
        <ul className="m-0 list-none border-t border-[var(--dream-line)] p-0">
          {items.map((item) => {
            const label = itemLabel(item);
            const productHref =
              item.productSlug && shopEnabled
                ? `/shop/${item.productSlug}`
                : null;
            const atMax =
              item.maxInventory !== undefined &&
              item.quantity >= item.maxInventory;
            const onSale =
              item.compareAtPrice != null && item.compareAtPrice > item.price;

            return (
              <li
                key={`${item.productId}-${item.variantId ?? "base"}`}
                className="flex gap-4 border-b border-[var(--dream-line)] py-6 sm:gap-6"
              >
                <DreamLineThumb
                  src={item.imageUrl}
                  className="size-[88px] rounded-[var(--dream-radius-photo-sm)] sm:size-[112px]"
                />

                <div className="flex min-w-0 flex-1 flex-col gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="[font-family:var(--font-dream-display)] text-[20px] leading-[1.2] text-[var(--dream-ink)] sm:text-[24px]">
                        {productHref ? (
                          <Link
                            href={productHref}
                            className="text-inherit no-underline decoration-[var(--dream-rose)] underline-offset-4 hover:underline"
                          >
                            {item.productName}
                          </Link>
                        ) : (
                          item.productName
                        )}
                      </h3>
                      {item.variantName ? (
                        <p className="mt-1 text-[14px] text-[var(--dream-soft)]">
                          {item.variantName}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[14px] text-[var(--dream-soft)] tabular-nums">
                        {formatPrice(item.price)} each
                        {onSale && item.compareAtPrice != null ? (
                          <span className="ml-2 line-through opacity-80">
                            <span className="sr-only">Original price: </span>
                            {formatPrice(item.compareAtPrice)}
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <p className="shrink-0 text-[16px] font-semibold text-[var(--dream-ink)] tabular-nums">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div
                      role="group"
                      aria-label={`Quantity for ${label}`}
                      className="inline-flex h-10 items-center rounded-[var(--dream-radius-pill)] border border-[var(--dream-line)] bg-[var(--dream-white)]"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          decrementItem(item.productId, item.variantId)
                        }
                        disabled={item.quantity <= 1}
                        aria-label={`Decrease quantity of ${label}`}
                        className="grid size-10 place-items-center rounded-full text-[var(--dream-ink)] disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <Minus
                          className="size-4"
                          strokeWidth={1.5}
                          aria-hidden="true"
                        />
                      </button>
                      <span
                        className="w-8 text-center text-[15px] font-semibold tabular-nums"
                        aria-live="polite"
                        aria-atomic="true"
                      >
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          incrementItem(item.productId, item.variantId)
                        }
                        disabled={atMax}
                        aria-label={`Increase quantity of ${label}`}
                        className="grid size-10 place-items-center rounded-full text-[var(--dream-ink)] disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <Plus
                          className="size-4"
                          strokeWidth={1.5}
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId, item.variantId)}
                      aria-label={`Remove ${label} from cart`}
                      className="dream-link inline-flex items-center gap-1.5 bg-transparent p-0 text-[14px]"
                    >
                      <X
                        className="size-3.5"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {copy.continueLabel && shopEnabled ? (
          <div className="mt-8">
            <Link href="/shop" className="dream-link text-[15px]">
              <span aria-hidden="true">← </span>
              <span {...fieldAttr("dream.cart.continue-label")}>
                {copy.continueLabel}
              </span>
            </Link>
          </div>
        ) : null}
      </div>

      {/* Summary */}
      <aside
        {...sectionGroupAttr("cart", "summary")}
        aria-labelledby="dream-cart-summary-heading"
        className="dream-card lg:sticky lg:top-[calc(var(--dream-header-h)+24px)]"
      >
        <h2
          id="dream-cart-summary-heading"
          className="[font-family:var(--font-dream-display)] text-[28px] leading-[1.1] text-[var(--dream-ink)]"
          {...fieldAttr("dream.cart.summary-heading")}
        >
          {copy.summaryHeading}
        </h2>

        <dl className="mt-6 flex flex-col gap-3 text-[15px]">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-[var(--dream-soft)]">
              Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})
            </dt>
            <dd className="m-0 font-semibold text-[var(--dream-ink)] tabular-nums">
              {formatPrice(subtotal)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-[var(--dream-soft)]">Shipping</dt>
            <dd className="m-0 text-right text-[var(--dream-ink)] tabular-nums">
              {shippingLabel(subtotal, shippingConfig)}
            </dd>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-[var(--dream-line)] pt-4">
            <dt className="font-semibold text-[var(--dream-ink)]">
              Estimated total
            </dt>
            <dd className="m-0 text-[22px] font-semibold text-[var(--dream-ink)] tabular-nums">
              {formatPrice(
                subtotal +
                  (shippingConfig.shippingType === SHIPPING_TYPES.ZONE_WEIGHT
                    ? 0
                    : calculateShipping(subtotal, shippingConfig)),
              )}
            </dd>
          </div>
        </dl>

        {copy.summaryNote ? (
          <p
            className="mt-3 text-[14px] leading-[1.6] text-[var(--dream-soft)]"
            {...fieldAttr("dream.cart.summary-note")}
          >
            {copy.summaryNote}
          </p>
        ) : null}

        {checkoutEnabled && copy.checkoutLabel ? (
          <div className="mt-6">
            <DreamButton href="/checkout" className="w-full">
              <span {...fieldAttr("dream.cart.checkout-label")}>
                {copy.checkoutLabel}
              </span>
            </DreamButton>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
