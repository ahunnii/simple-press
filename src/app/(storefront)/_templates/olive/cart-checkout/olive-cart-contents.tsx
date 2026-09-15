"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { formatPrice } from "~/lib/prices";
import { useCart } from "~/providers/cart-context";

import {
  colorFromName,
  hasOliveImage,
  OliveButton,
  OliveChip,
  OliveEmptyState,
  OliveImageFallback,
  OlivePrice,
  OliveQuantityStepper,
  OliveRevealGroup,
} from "../shared";

type Props = {
  summaryHeading: string;
  summaryHeadingFieldKey?: string;
  summaryNote: string;
  summaryNoteFieldKey?: string;
  checkoutLabel: string;
  checkoutLabelFieldKey?: string;
  continueShoppingLabel: string;
  continueShoppingFieldKey?: string;
  emptyHeading: string;
  emptyBody: string;
  emptyCta: string;
};

/**
 * The chip discipline in one function: a variant only earns a swatch when one
 * of its option segments is a colour the template actually knows. "Sage / M"
 * gets a sage chip; "Small / Left-handed" gets none, because inventing a
 * colour for a word that is not a colour is exactly the decorative chip the
 * design forbids.
 */
function variantColorName(variantName: string | null): string | null {
  if (!variantName) return null;
  for (const raw of variantName.split("/")) {
    const segment = raw.trim();
    if (segment.length > 0 && colorFromName(segment) !== null) return segment;
  }
  return null;
}

/**
 * Cart contents — line items, the summary card, the hydration skeleton and
 * the empty bag. The bag lives in localStorage only, so everything here is
 * client-side and the first paint has to be a deliberate placeholder rather
 * than an empty state that flips to full a frame later.
 */
export function OliveCartContents({
  summaryHeading,
  summaryHeadingFieldKey,
  summaryNote,
  summaryNoteFieldKey,
  checkoutLabel,
  checkoutLabelFieldKey,
  continueShoppingLabel,
  continueShoppingFieldKey,
  emptyHeading,
  emptyBody,
  emptyCta,
}: Props) {
  const { items, incrementItem, decrementItem, removeItem, total, isHydrated } =
    useCart();

  // ── Hydration skeleton — three resting cards and the summary's footprint,
  // so the page does not jump from "empty bag" to a full list. ──────────────
  if (!isHydrated) {
    return (
      <div
        aria-hidden="true"
        className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-8"
      >
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((n) => (
            <div key={n} className="olive-card olive-card-paper h-[136px]" />
          ))}
        </div>
        <div className="olive-card h-[260px]" />
      </div>
    );
  }

  // ── Empty bag ─────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="mt-10">
        <OliveEmptyState
          numeral="0"
          headingAs="h2"
          heading={emptyHeading}
          body={emptyBody}
          cta={{ label: emptyCta, href: "/shop" }}
        />
      </div>
    );
  }

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-8">
      {/* ── Line items ─────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="olive-label" aria-live="polite">
            {itemCount === 1 ? "1 item" : `${itemCount} items`}
          </p>
          <OliveButton
            variant="ghost"
            href="/shop"
            data-sp-field={continueShoppingFieldKey}
          >
            {continueShoppingLabel}
          </OliveButton>
        </div>

        <OliveRevealGroup fan>
          <ul className="flex flex-col gap-4">
            {items.map((item, i) => {
              const colorName = variantColorName(item.variantName);
              const lineTotal = item.price * item.quantity;

              return (
                <li
                  key={`${item.productId}-${item.variantId ?? "base"}`}
                  className="olive-reveal-item"
                  style={{ "--i": Math.min(i, 8) } as CSSProperties}
                >
                  <div className="olive-card olive-card-paper olive-card-lift flex gap-4 p-3 sm:p-4">
                    <div
                      className="relative w-[76px] shrink-0 overflow-hidden sm:w-[92px]"
                      style={{
                        aspectRatio: "4 / 5",
                        borderRadius: "var(--radius)",
                        border: "1px solid var(--olive-hairline)",
                      }}
                    >
                      {hasOliveImage(item.imageUrl) ? (
                        <Image
                          src={item.imageUrl ?? ""}
                          // Decorative: the product name sits right beside
                          // it, so alt text here would only be read twice.
                          alt=""
                          fill
                          sizes="92px"
                          className="object-cover"
                        />
                      ) : (
                        <OliveImageFallback size={22} />
                      )}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          {/* Not a heading: the page runs h1 → h2 (summary),
                              and a per-item h3 in the left column would skip a
                              level before that h2 ever appears. The name is
                              the route back to the product — a bag with no way
                              back to the page you came from is a dead end.
                              An id in place of a slug is canonicalised by
                              `/shop/[slug]` (old saved carts store ids). */}
                          <p className="olive-card-title">
                            <Link
                              href={`/shop/${item.productSlug ?? item.productId}`}
                              className="hover:underline"
                            >
                              {item.productName}
                            </Link>
                          </p>
                          {item.variantName ? (
                            <p className="olive-caption mt-1 flex items-center gap-2">
                              {colorName ? (
                                <OliveChip
                                  color={colorName}
                                  label={colorName}
                                  size={14}
                                  srOnlyLabel={false}
                                />
                              ) : null}
                              <span>{item.variantName}</span>
                            </p>
                          ) : null}
                        </div>

                        <button
                          type="button"
                          className="olive-icon-btn shrink-0"
                          aria-label={`Remove ${item.productName} from your bag`}
                          onClick={() =>
                            removeItem(item.productId, item.variantId)
                          }
                        >
                          <X aria-hidden="true" className="h-4 w-4" />
                        </button>
                      </div>

                      <OlivePrice
                        price={item.price}
                        compareAtPrice={item.compareAtPrice ?? null}
                        showSavings={false}
                      />

                      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-1">
                        <OliveQuantityStepper
                          value={item.quantity}
                          itemLabel={item.productName}
                          max={item.maxInventory}
                          onChange={(next) => {
                            if (next > item.quantity) {
                              incrementItem(item.productId, item.variantId);
                            } else if (next < item.quantity) {
                              decrementItem(item.productId, item.variantId);
                            }
                          }}
                        />
                        <p className="olive-price">
                          <span className="sr-only">Line total </span>
                          {formatPrice(lineTotal)}
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </OliveRevealGroup>
      </div>

      {/* ── Summary ────────────────────────────────────────────────────── */}
      <aside
        aria-labelledby="olive-cart-summary-heading"
        className="lg:sticky"
        style={{ top: "calc(var(--olive-header-h) + 1.5rem)" }}
      >
        <div className="olive-card flex flex-col gap-4 p-5 sm:p-6">
          <h2
            id="olive-cart-summary-heading"
            className="olive-h3"
            {...(summaryHeadingFieldKey
              ? fieldAttr(summaryHeadingFieldKey)
              : {})}
          >
            {summaryHeading}
          </h2>

          <dl className="flex flex-col gap-3">
            <div
              className="flex items-baseline justify-between gap-4 pt-3"
              style={{ borderTop: "1px solid var(--olive-hairline)" }}
            >
              <dt className="olive-label">Subtotal</dt>
              {/* Prices stay in the body face at weight 500 (design.md
                  § Typography); only the size steps up so the number is the
                  card's anchor. */}
              <dd className="olive-price" style={{ fontSize: "1.25rem" }}>
                {formatPrice(total)}
              </dd>
            </div>
          </dl>

          {summaryNote ? (
            <p
              className="olive-caption"
              {...(summaryNoteFieldKey ? fieldAttr(summaryNoteFieldKey) : {})}
            >
              {summaryNote}
            </p>
          ) : null}

          <OliveButton
            variant="primary"
            href="/checkout"
            className="w-full"
            data-sp-field={checkoutLabelFieldKey}
          >
            {checkoutLabel}
          </OliveButton>
        </div>
      </aside>
    </div>
  );
}
