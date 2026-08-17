"use client";

import { useMemo } from "react";
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
 * ever sent (`toPreviewWireAnswers` — free-text answers, where the PII is,
 * never ride this anonymous uncaptcha'd query), the payload is debounced, and
 * the response is a `CustomerEstimate` and nothing else. There is no client
 * fallback: an estimate the server declines to send is an estimate this hook
 * has no way to invent.
 */
export function useLiveEstimate({
  calculatorId,
  enabled,
  visibleQuestions,
  answers,
}: {
  calculatorId: string;
  /** `definition.showLiveEstimate` — already the EFFECTIVE owner setting. */
  enabled: boolean;
  visibleQuestions: PublicQuoteQuestion[];
  answers: QuoteAnswerMap;
}): { estimate: CustomerEstimate | null; isFetching: boolean } {
  const wire = useMemo(
    () => toPreviewWireAnswers(visibleQuestions, answers),
    [visibleQuestions, answers],
  );

  // Debounced as a STRING, not as the array. The array is rebuilt on every
  // keystroke even when nothing about it changed (a new object each render),
  // so debouncing it directly would restart the timer forever and, on a fast
  // typist, never fire. Serialising first means an edit that leaves the
  // priced answers identical — typing in a `text` question, say — produces the
  // same key and costs nothing.
  const debouncedKey = useDebouncedValue(
    JSON.stringify(wire),
    PREVIEW_DEBOUNCE_MS,
  );
  const debouncedWire = useMemo(
    () => JSON.parse(debouncedKey) as QuoteWireAnswer[],
    [debouncedKey],
  );

  const { data, isFetching } = api.quoteCalculator.previewEstimate.useQuery(
    { calculatorId, answers: debouncedWire },
    {
      enabled: enabled && debouncedWire.length > 0,
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

  return { estimate: data?.estimate ?? null, isFetching };
}
