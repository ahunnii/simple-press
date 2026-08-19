"use client";

import { useEffect, useRef } from "react";
import { CircleCheck } from "lucide-react";

import { formatPrice } from "~/lib/prices";

/**
 * The SUCCESS member of `quoteSubmission.submit`'s discriminated union — the
 * only member this screen ever sees.
 *
 * The mutation also returns `{ success: false, error }` for the four failures a
 * visitor can fix themselves (an unknown ZIP, an option the owner deleted mid-
 * session, …). Those never reach here: the runner intercepts them in
 * `onSuccess`, routes the visitor back to the question at fault and leaves the
 * flow on screen, so a result screen is by construction a captured lead.
 *
 * `estimate` is present ONLY when the owner turned "show the estimate to the
 * customer" on, and its shape (exact vs range) is chosen server-side too —
 * `displayAsRange` and the range padding are stripped by
 * `toPublicCalculatorDefinition` and never reach the browser.
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
          {/* The owner's own words, on both branches. This used to render only
              when there was no estimate, so the owners most likely to have
              written a warm one — the ones confident enough to show a price —
              were the only ones who never saw it. Sits between the figure and
              the caveat: the number answers "how much?", this answers "what
              happens now?", and the fine print qualifies both. */}
          <p className="text-foreground max-w-md text-sm font-medium">
            {thankYouMessage}
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
