"use client";

import { useId, useState } from "react";
import Link from "next/link";

import type { DefaultProductPageTemplateProps } from "../../_templates/types";
import type { SubscriptionIntervalKey } from "~/lib/subscriptions/intervals";
import { formatPrice } from "~/lib/prices";
import { parseCardAdditionalFields } from "~/lib/products";
import { getInterval } from "~/lib/subscriptions/intervals";
import {
  computeSubscriptionQuote,
  getSubscriptionOffer,
  SubscriptionPricingError,
} from "~/lib/subscriptions/pricing";
import { cn } from "~/lib/utils";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

type Props = {
  product: DefaultProductPageTemplateProps["product"];
  selectedVariantId: string | null;
  quantity: number;
  className?: string;
};

/**
 * "Subscribe & save" panel rendered directly below a template's Add-to-cart
 * control. Shared across templates (currently wired into `default` and
 * `happy-bamboo`) — styled with design tokens only, never a template-specific
 * class, so it looks correct inside any template's chrome.
 *
 * Renders nothing unless the `subscriptions` flag is on, the product has
 * subscriptions enabled with at least one configured cadence, and the product
 * isn't marked "coming soon" — the same eligibility rule the `/subscribe`
 * page and the checkout route enforce server-side. Hiding this panel is a UX
 * courtesy only; every real gate lives server-side.
 */
export function SubscribePanel({
  product,
  selectedVariantId,
  quantity,
  className,
}: Props) {
  const { isEnabled } = useStorefrontFlags();
  const additionalFields = parseCardAdditionalFields(product.additionalFields);
  const offer = getSubscriptionOffer(product, selectedVariantId);
  const groupId = useId();

  // Hooks must run unconditionally on every render — the eligibility check
  // below only affects what we return, not whether this state exists.
  const [intervalKey, setIntervalKey] =
    useState<SubscriptionIntervalKey | null>(offer.intervals[0] ?? null);

  const eligible =
    isEnabled("subscriptions") &&
    offer.enabled &&
    !additionalFields.comingSoon &&
    offer.intervals.length > 0;

  const selectedInterval =
    intervalKey && offer.intervals.includes(intervalKey)
      ? intervalKey
      : (offer.intervals[0] ?? null);

  if (!eligible || !selectedInterval) return null;

  let quote;
  try {
    quote = computeSubscriptionQuote({
      listPriceCents: offer.listPriceCents,
      discountPercent: offer.discountPercent,
      quantity,
      // Shipping is priced on the `/subscribe` page from the shopper's real
      // address — this panel only ever shows the item total.
      shippingCents: 0,
    });
  } catch (err) {
    if (err instanceof SubscriptionPricingError) return null;
    throw err;
  }

  const heading =
    offer.discountPercent > 0
      ? `Subscribe & save ${offer.discountPercent}%`
      : "Subscribe";

  const href = `/subscribe?product=${product.slug}&variant=${selectedVariantId ?? ""}&interval=${selectedInterval}&qty=${quantity}`;

  return (
    <div
      className={cn(
        "border-border bg-card flex flex-col gap-4 rounded-[var(--radius)] border p-5",
        className,
      )}
    >
      <div>
        <p className="text-card-foreground text-sm font-semibold">{heading}</p>
        <p className="text-card-foreground mt-1 text-2xl font-semibold">
          {formatPrice(quote.itemsCents)}{" "}
          <span className="text-muted-foreground text-sm font-normal">
            per delivery
          </span>
        </p>
        {offer.discountPercent > 0 && quote.savingsCents > 0 && (
          <p className="text-muted-foreground mt-1 text-sm">
            You save {formatPrice(quote.savingsCents)} vs. the one-time price
          </p>
        )}
      </div>

      {offer.intervals.length > 1 && (
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="text-muted-foreground mb-1 p-0 text-xs font-medium tracking-[0.08em] uppercase">
            Delivery frequency
          </legend>
          <div className="flex flex-wrap gap-2">
            {offer.intervals.map((key) => {
              const entry = getInterval(key);
              const checked = selectedInterval === key;
              return (
                <label
                  key={key}
                  className={cn(
                    "border-border flex cursor-pointer items-center gap-1.5 rounded-[var(--radius)] border px-3 py-1.5 text-sm transition-colors",
                    checked && "border-primary bg-primary/5",
                  )}
                >
                  <input
                    type="radio"
                    name={`subscribe-interval-${groupId}`}
                    value={key}
                    checked={checked}
                    onChange={() => setIntervalKey(key)}
                    className="focus-visible:ring-ring size-4 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  />
                  {entry?.shortLabel ?? key}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <p className="text-muted-foreground text-xs">
        Shipping calculated at the next step — cancel anytime.
      </p>

      <Link
        href={href}
        className="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex h-11 items-center justify-center rounded-[var(--radius)] px-5 text-sm font-medium transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        Subscribe
      </Link>
    </div>
  );
}
