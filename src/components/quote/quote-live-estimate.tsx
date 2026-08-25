"use client";

import { LoaderCircle } from "lucide-react";

import type { CustomerEstimate } from "~/lib/quote/customer-estimate";
import { formatPrice } from "~/lib/prices";

function isRange(
  estimate: CustomerEstimate,
): estimate is { lowCents: number; highCents: number } {
  return "lowCents" in estimate;
}

/**
 * The running estimate strip.
 *
 * Renders ONLY what the server returned — `CustomerEstimate` comes straight
 * out of `quoteCalculator.previewEstimate`, which recomputed it from the
 * stored definition. There is no client-side pricing here and there cannot be:
 * the formula, the option values and the range padding are all stripped by
 * `toPublicCalculatorDefinition` before the definition reaches the browser.
 *
 * See `useLiveEstimate` for why this panel is opt-in: watching the number move
 * as answers change is exactly how a visitor works out what each option costs,
 * which is fine for menu-style pricing and wrong for a sensitive rate table.
 *
 * Positioned below the step body and above the nav, deliberately: a strip that
 * appeared above the question would push the heading down the moment the first
 * priced answer landed, moving the thing the visitor is reading.
 */
export function QuoteLiveEstimatePanel({
  estimate,
  isFetching,
  disclaimer,
}: {
  estimate: CustomerEstimate | null;
  isFetching: boolean;
  disclaimer: string;
}) {
  // Hidden until there is something to say. An empty strip reserving space for
  // a number that may never arrive (nothing priced answered yet, the endpoint
  // rate-limited, the owner switched it off mid-session) is worse than no
  // strip: it reads as a broken widget.
  if (!estimate) return null;

  return (
    <div className="border-input mt-6 rounded-md border border-dashed px-3 py-2">
      <div className="flex min-h-8 items-baseline justify-between gap-3">
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Running estimate
        </span>
        <span
          aria-live="polite"
          className="text-foreground inline-flex items-center gap-2 text-lg font-semibold"
        >
          {isFetching && (
            <LoaderCircle
              className="text-muted-foreground size-3.5 animate-spin"
              aria-hidden="true"
            />
          )}
          {isRange(estimate)
            ? `${formatPrice(estimate.lowCents)} – ${formatPrice(estimate.highCents)}`
            : formatPrice(estimate.exactCents)}
        </span>
      </div>
      {disclaimer !== "" && (
        <p className="text-muted-foreground text-xs">{disclaimer}</p>
      )}
    </div>
  );
}
