"use client";

import { useEffect, useRef } from "react";
import { CircleCheck } from "lucide-react";

import { formatPrice } from "~/lib/prices";

/**
 * What `quoteSubmission.submit` returns. `estimate` is present ONLY when the
 * owner turned "show the estimate to the customer" on, and its shape (exact vs
 * range) is chosen server-side too — `displayAsRange` and the range padding are
 * stripped by `toPublicCalculatorDefinition` and never reach the browser.
 */
export type QuoteSubmitResult = {
  success: true;
  estimate?: { exactCents: number } | { lowCents: number; highCents: number };
};

function isRange(
  estimate: NonNullable<QuoteSubmitResult["estimate"]>,
): estimate is { lowCents: number; highCents: number } {
  return "lowCents" in estimate;
}

export function QuoteResult({
  result,
  thankYouMessage,
  responseDays,
}: {
  result: QuoteSubmitResult;
  thankYouMessage: string;
  responseDays: number;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // The step the visitor was on has just been replaced; move focus to the
  // outcome so a screen-reader / keyboard user is not left on a button that no
  // longer exists.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const responseLine = `We'll get back to you within ${responseDays} business day${
    responseDays === 1 ? "" : "s"
  }.`;

  // Renders ONLY what the server returned. There is no client-side pricing
  // fallback on purpose: option values, the formula and the range padding are
  // all owner-private, so an estimate the server chose not to send is an
  // estimate this screen must not invent.
  const estimate = result.estimate;

  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <CircleCheck className="text-primary size-10" aria-hidden="true" />

      {estimate ? (
        <>
          <h3
            ref={headingRef}
            tabIndex={-1}
            className="text-muted-foreground text-sm font-medium tracking-wide uppercase outline-none"
          >
            Your estimated quote
          </h3>
          <p className="text-foreground text-3xl font-semibold sm:text-4xl">
            {isRange(estimate)
              ? `${formatPrice(estimate.lowCents)} – ${formatPrice(estimate.highCents)}`
              : formatPrice(estimate.exactCents)}
          </p>
          <p className="text-muted-foreground max-w-md text-sm">
            This is an estimate — we&apos;ll confirm the final price with you.
          </p>
          <p className="text-muted-foreground max-w-md text-sm">
            {responseLine}
          </p>
        </>
      ) : (
        <>
          <h3
            ref={headingRef}
            tabIndex={-1}
            className="text-foreground text-xl font-semibold outline-none"
          >
            {thankYouMessage}
          </h3>
          <p className="text-muted-foreground max-w-md text-sm">
            {responseLine}
          </p>
        </>
      )}
    </div>
  );
}
