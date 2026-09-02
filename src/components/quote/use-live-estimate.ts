"use client";

import { useEffect, useMemo, useRef } from "react";
import { keepPreviousData } from "@tanstack/react-query";

import type { QuoteAnswerMap } from "./quote-answers";
import type { CustomerEstimate } from "~/lib/quote/customer-estimate";
import type {
  PublicQuoteQuestion,
  QuoteWireAnswer,
} from "~/lib/validators/quote-calculator";
import { api } from "~/trpc/react";
import { useDebouncedValue } from "~/hooks/use-debounced-value";

import { toPreviewWireAnswers } from "./quote-answers";

/**
 * How long the visitor has to stop changing answers before the estimate is
 * re-priced. Long enough that dragging a number field from 1 to 12 is one
 * request rather than eleven — `quoteLivePreviewLimiter` allows 30/min per
 * ip:host and a single indecisive visitor must not spend the whole budget.
 */
const PREVIEW_DEBOUNCE_MS = 500;

/**
 * The running estimate behind `QuoteLiveEstimatePanel`.
 *
 * **The probing tradeoff is real and the owner opted into it.** With this on, a
 * visitor can flip one answer back and forth and watch the number move, which
 * effectively discloses what that option is worth. That is the whole reason
 * `showLiveEstimate` defaults to off, is nested under "show the estimate to the
 * customer", and is re-checked server-side — the full note lives on
 * `quoteCalculator.previewEstimate`, which FORBIDs the call regardless of what
 * this hook thinks the projection said.
 *
 * What limits the exposure from here: only price-bearing question types are
 * ever sent (`toPreviewWireAnswers` — free-text answers never ride this
 * anonymous uncaptcha'd query, and an address answer is reduced to its ZIP,
 * so the PII stays off the wire), the payload is debounced, and
 * the response is a `CustomerEstimate` and nothing else. There is no client
 * fallback: an estimate the server declines to send is an estimate this hook
 * has no way to invent.
 */
export function useLiveEstimate({
  calculatorId,
  enabled,
  visibleQuestions,
  answers,
  tabId,
}: {
  calculatorId: string;
  /** `definition.showLiveEstimate` — already the EFFECTIVE owner setting. */
  enabled: boolean;
  visibleQuestions: PublicQuoteQuestion[];
  answers: QuoteAnswerMap;
  /** The visitor's current tab choice — `null` for a tabs-less calculator, or
   *  before one has been picked. A calculator whose tabs override the
   *  formula prices the wrong half of the business without this: the server
   *  re-derives EVERYTHING from the stored definition, and the tab is part
   *  of which definition that is. */
  tabId: string | null;
}): { estimate: CustomerEstimate | null; isFetching: boolean } {
  const wire = useMemo(
    () => toPreviewWireAnswers(visibleQuestions, answers),
    [visibleQuestions, answers],
  );

  // Debounced as a STRING, not as the array/tabId pair. Both are rebuilt (or
  // re-passed) on every keystroke even when nothing about them changed, so
  // debouncing the pair directly would restart the timer forever and, on a
  // fast typist, never fire. Serialising first means an edit that leaves the
  // priced answers identical — typing in a `text` question, say — produces
  // the same key and costs nothing. `tabId` rides in the SAME key
  // (`JSON.stringify({ tabId, wire })`), not a separate debounce: switching
  // tabs must re-price exactly once, not once for the tab and again for
  // whatever `wire` happens to look like when the timer next settles.
  const debouncedKey = useDebouncedValue(
    JSON.stringify({ tabId, wire }),
    PREVIEW_DEBOUNCE_MS,
  );
  const debounced = useMemo(
    () =>
      JSON.parse(debouncedKey) as {
        tabId: string | null;
        wire: QuoteWireAnswer[];
      },
    [debouncedKey],
  );
  const debouncedWire = debounced.wire;
  const debouncedTabId = debounced.tabId;

  // Separate from `enabled` (the prop): also folds in "nothing priced has
  // been answered yet". Both the query's `enabled` option and the "should the
  // strip disappear" decision below have to agree on this, or the two could
  // draw different conclusions from the same debounce tick.
  const queryEnabled = enabled && debouncedWire.length > 0;

  const { data, isFetching, isError } =
    api.quoteCalculator.previewEstimate.useQuery(
      {
        calculatorId,
        answers: debouncedWire,
        // Omitted rather than sent as `null`: `quotePreviewEstimateSchema`
        // (via `quoteSubmitSchema`) types `tabId` as an optional STRING, so a
        // tabs-less calculator — or a request that raced ahead of the first
        // tab pick — must not send a key the schema does not recognize.
        ...(debouncedTabId !== null ? { tabId: debouncedTabId } : {}),
      },
      {
        enabled: queryEnabled,
        // `keepPreviousData` so the panel shows the last figure while the next
        // one is in flight instead of blinking empty on every answer change.
        placeholderData: keepPreviousData,
        staleTime: 60_000,
        // No retry: a FORBIDDEN (owner turned the estimate off mid-session) or a
        // 429 is not going to succeed on a second attempt, and retrying spends
        // the same limiter budget that produced the 429.
        retry: false,
      },
    );

  // `keepPreviousData` only bridges a REFETCH — the moment the request
  // actually fails, react-query drops `data` back to `undefined`, and without
  // this the strip would blink away on a single dropped request (a 429, a
  // blip) rather than holding the last figure the visitor already saw. Set
  // from an effect rather than during render so it only ever captures a
  // response that arrived, never a stale value smuggled in via `enabled`
  // dropping — see the `!queryEnabled` guard below, which is the one place
  // that decides the strip disappears rather than this ref.
  const lastGoodEstimateRef = useRef<CustomerEstimate | null>(null);
  useEffect(() => {
    if (data) {
      lastGoodEstimateRef.current = data.estimate ?? null;
    }
  }, [data]);

  const estimate = !queryEnabled
    ? // Nothing priced is currently answered (or the owner-level flag is
      // off) — the strip must disappear, even if a good estimate is sitting
      // in the ref from an answer the visitor has since cleared.
      null
    : isError
      ? lastGoodEstimateRef.current
      : (data?.estimate ?? null);

  return { estimate, isFetching };
}
