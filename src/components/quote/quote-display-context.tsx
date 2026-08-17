"use client";

import { createContext, useContext, useMemo } from "react";

import type {
  QuoteDensity,
  QuoteDensityClasses,
} from "~/lib/quote/quote-display";
import { quoteDensityClasses } from "~/lib/quote/quote-display";

/**
 * Density (the owner's per-embed spacing preset) travels by context rather
 * than by prop.
 *
 * It has to reach the option cards inside `QuoteQuestionField`, which sit four
 * components below the runner and are reached through two different parents
 * (`QuoteScreen` renders them; the address field renders its own sub-grid).
 * Threading a `density` prop through all of that would put a presentational
 * value on every intermediate signature, and every new field type would have
 * to remember to forward it — the exact shape of bug where one control quietly
 * stays "comfortable" in a spacious embed.
 */
const QuoteDensityContext = createContext<QuoteDensityClasses | null>(null);

/**
 * Computed once at module load so the no-provider fallback is a stable object
 * identity — a fresh object per `useQuoteDensity()` call would defeat every
 * `useMemo`/`memo` downstream that depends on it.
 */
const DEFAULT_DENSITY_CLASSES = quoteDensityClasses("comfortable");

export function QuoteDisplayProvider({
  density,
  children,
}: {
  density?: QuoteDensity;
  children: React.ReactNode;
}) {
  const value = useMemo(() => quoteDensityClasses(density), [density]);
  return (
    <QuoteDensityContext.Provider value={value}>
      {children}
    </QuoteDensityContext.Provider>
  );
}

/**
 * The spacing/typography classes for the current embed.
 *
 * Falls back to `comfortable` — today's exact literals — outside a provider,
 * so a field component rendered in isolation (a test, a future admin preview)
 * looks like it always has rather than losing its padding.
 */
export function useQuoteDensity(): QuoteDensityClasses {
  return useContext(QuoteDensityContext) ?? DEFAULT_DENSITY_CLASSES;
}
