"use client";

import { useEffect, useState } from "react";

import { api } from "~/trpc/react";

/** Debounce before the ZIP lookup fires — the router rate-limits it 30/min. */
const ZIP_LOOKUP_DEBOUNCE_MS = 400;

/**
 * The debounced "City, ST" confirmation shown under a ZIP input.
 *
 * Shared by the standalone `zip` question and the ZIP box inside an `address`
 * question, which are two different controls with identical lookup semantics —
 * the same debounce, the same rate-limit budget, the same
 * advisory-never-blocking treatment of a failure. Duplicating it would mean
 * two debounce constants to keep in step and two chances to leave one of them
 * firing on every keystroke.
 *
 * `showResult` folds in the "the ZIP has changed since we asked" case: the
 * query keeps returning the previous answer while the visitor edits, and
 * printing a city that no longer matches what is in the box is worse than
 * printing nothing.
 */
export function useZipLookup(zip: string) {
  const [debouncedZip, setDebouncedZip] = useState("");

  // Hand-rolled debounce (setTimeout + cleanup) rather than a dependency: the
  // lookup is keystroke-adjacent, so firing on the 5th digit of every edit
  // would burn the 30/min budget in a few corrections.
  useEffect(() => {
    if (!/^\d{5}$/.test(zip)) {
      setDebouncedZip("");
      return;
    }
    const timer = setTimeout(
      () => setDebouncedZip(zip),
      ZIP_LOOKUP_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [zip]);

  const { data, isFetching, isError } = api.quoteCalculator.lookupZip.useQuery(
    debouncedZip,
    {
      enabled: debouncedZip.length === 5,
      retry: false,
      // The ZIP table never changes mid-session; re-asking on every remount
      // only spends rate-limit budget.
      staleTime: 5 * 60 * 1000,
    },
  );

  return {
    showResult: debouncedZip.length === 5 && debouncedZip === zip,
    isFetching,
    isError,
    data,
  };
}
