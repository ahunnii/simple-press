import type { QuoteCalculatorDefinition } from "~/lib/validators/quote-calculator";

/**
 * What the VISITOR is told the price is.
 *
 * One function, three callers that must never disagree: the `submit` mutation
 * (thank-you screen + confirmation email), the `previewEstimate` query (the
 * live running estimate), and the admin test panel's "What the visitor sees".
 * Before this existed the range math was inlined in `submit`, so the test panel
 * could show an owner a figure their own storefront would never print.
 *
 * Pure and type-only against the validator module, so it is safe to import from
 * a client component: nothing here reads the formula, the option values or the
 * hidden defaults — it only reshapes a number the SERVER already computed.
 */
export type CustomerEstimate =
  | { exactCents: number }
  | { lowCents: number; highCents: number };

/**
 * `undefined` — not zero, not a null estimate — means "tell them nothing about
 * price". Two different situations collapse into it deliberately, because they
 * render identically:
 *
 * - the owner keeps the estimate internal (`showEstimateToCustomer` off), and
 * - there is no estimate to tell them about (`estimateCents === null`, i.e.
 *   `computeQuote` captured the lead but could not put a number on it).
 *
 * Callers omit the pricing block entirely in both cases rather than printing
 * "$0.00" or an empty range.
 */
export function customerEstimateFrom(
  definition: Pick<
    QuoteCalculatorDefinition,
    "showEstimateToCustomer" | "displayAsRange" | "rangePaddingPercent"
  >,
  estimateCents: number | null,
): CustomerEstimate | undefined {
  if (!definition.showEstimateToCustomer || estimateCents === null) {
    return undefined;
  }

  if (!definition.displayAsRange) {
    return { exactCents: estimateCents };
  }

  // Padding is applied to the computed figure symmetrically and rounded to
  // whole cents on each end independently — the same arithmetic that has been
  // producing stored/emailed ranges since the feature shipped. Do not "improve"
  // it into a single rounded half-width: old submissions would stop matching
  // the ranges their confirmation emails already quoted.
  return {
    lowCents: Math.round(
      estimateCents * (1 - definition.rangePaddingPercent / 100),
    ),
    highCents: Math.round(
      estimateCents * (1 + definition.rangePaddingPercent / 100),
    ),
  };
}
