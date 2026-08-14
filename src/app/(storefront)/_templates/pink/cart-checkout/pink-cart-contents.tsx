"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { formatPrice } from "~/lib/prices";
import { useCart } from "~/providers/cart-context";

import { PinkEmptyState } from "../shared/pink-empty-state";

type Props = {
  heading: string;
  summaryNote: string;
  checkoutLabel: string;
  continueShoppingLabel: string;
  emptyHeading: string;
  emptyBody: string;
  emptyCta: string;
};

/**
 * Client half of the cart page (server → client handoff). Reads `useCart()`
 * exclusively for items/quantity/removal — mirrors the interactive line-item
 * internals of `PinkCartDrawer` (design.md: "The `PinkCartDrawer` shares
 * these line-item internals"), then a sticky ink basket panel that mirrors
 * the checkout aside. On mobile the basket panel renders ABOVE the line
 * items so shoppers see the total and CTA first.
 */
export function PinkCartContents({
  heading,
  summaryNote,
  checkoutLabel,
  continueShoppingLabel,
  emptyHeading,
  emptyBody,
  emptyCta,
}: Props) {
  const {
    items,
    incrementItem,
    decrementItem,
    removeItem,
    subtotal,
    isHydrated,
  } = useCart();

  // Hydration guard — neutral skeleton prevents an empty→filled flash.
  if (!isHydrated) {
    return (
      <div aria-hidden="true" className="flex flex-col gap-4">
        {[1, 2].map((n) => (
          <div
            key={n}
            className="h-24 animate-pulse"
            style={{ background: "var(--pink-panel)" }}
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <PinkEmptyState
        heading={emptyHeading}
        body={emptyBody}
        ctaLabel={emptyCta}
        ctaHref="/shop"
      />
    );
  }

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1.15fr_.85fr]">
      {/* Basket summary — order-first on mobile so totals/CTA show before the list */}
      <aside
        aria-label="Basket summary"
        className="order-first lg:sticky lg:order-2"
        style={{ top: "var(--pink-sticky-top)" }}
      >
        <div
          className="pink-dark flex flex-col gap-6 p-7 md:p-8"
          style={{ background: "var(--pink-ink)", color: "var(--pink-paper)" }}
        >
          <div
            className="flex items-baseline justify-between pb-4"
            style={{ borderBottom: "1px solid var(--pink-ink-line)" }}
          >
            <span
              className="pink-display"
              style={{ fontSize: 18, fontWeight: 600 }}
              {...fieldAttr("pink.cart.heading")}
            >
              {heading}
            </span>
            <span className="pink-label-dark">
              {itemCount} {itemCount === 1 ? "piece" : "pieces"}
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="pink-label-dark">Subtotal</span>
            <span
              className="pink-display"
              style={{ fontSize: 20, fontWeight: 600 }}
            >
              {formatPrice(subtotal)}
            </span>
          </div>

          {summaryNote && (
            <p
              className="text-[12px] leading-[1.6]"
              style={{ color: "var(--pink-ink-subtle)" }}
              {...fieldAttr("pink.cart.summary-note")}
            >
              {summaryNote}
            </p>
          )}

          <Link
            href="/checkout"
            className="pink-btn pink-btn-solid w-full justify-center"
            {...fieldAttr("pink.cart.checkout-label")}
          >
            {checkoutLabel}
          </Link>

          <Link
            href="/shop"
            className="text-center text-[13px] underline underline-offset-2 transition-opacity hover:opacity-70"
            style={{ color: "var(--pink-ink-muted)" }}
            {...fieldAttr("pink.cart.continue-shopping-label")}
          >
            {continueShoppingLabel}
          </Link>
        </div>
      </aside>

      {/* Line items */}
      <div
        role="list"
        aria-label="Items in your basket"
        className="order-2 flex flex-col lg:order-1"
      >
        {items.map((item, index) => {
          const lineTotal = item.price * item.quantity;
          return (
            <div
              key={`${item.productId}-${item.variantId ?? "no-variant"}`}
              role="listitem"
              className="flex gap-5 py-6"
              style={{
                borderTop: index === 0 ? "none" : "1px solid var(--pink-line)",
              }}
            >
              <div
                className="relative shrink-0 overflow-hidden"
                style={{
                  width: 96,
                  aspectRatio: "4 / 5",
                  background: "var(--pink-panel)",
                }}
              >
                <Image
                  src={item.imageUrl ?? "/placeholder.svg"}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2
                      className="pink-display truncate"
                      style={{ fontSize: 17, fontWeight: 600 }}
                    >
                      {item.productName}
                    </h2>
                    {item.variantName && (
                      <p
                        className="mt-0.5 text-[13px]"
                        style={{ color: "var(--pink-subtle)" }}
                      >
                        {item.variantName}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.productId, item.variantId)}
                    aria-label={`Remove ${item.productName}${item.variantName ? ` — ${item.variantName}` : ""} from basket`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center transition-colors hover:opacity-70"
                    style={{ color: "var(--pink-subtle)" }}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="mt-auto flex items-center justify-between gap-4 pt-2">
                  <div
                    role="group"
                    aria-label={`Quantity for ${item.productName}`}
                    className="flex items-center"
                    style={{ border: "1px solid var(--pink-line-strong)" }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        decrementItem(item.productId, item.variantId)
                      }
                      disabled={item.quantity <= 1}
                      aria-label={`Decrease quantity of ${item.productName}`}
                      className="flex h-10 w-10 items-center justify-center disabled:opacity-30"
                    >
                      <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <span
                      className="w-8 text-center text-[14px]"
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
                      disabled={
                        item.maxInventory !== undefined &&
                        item.quantity >= item.maxInventory
                      }
                      aria-label={`Increase quantity of ${item.productName}`}
                      className="flex h-10 w-10 items-center justify-center disabled:opacity-30"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>

                  <span
                    className="pink-display"
                    style={{ fontSize: 15, fontWeight: 600 }}
                  >
                    {formatPrice(lineTotal)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
