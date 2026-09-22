"use client";

import { useEffect, useRef, useState } from "react";

import { useReducedMotion } from "~/hooks/use-reduced-motion";

/** Matches `.olive-figure-settle`'s animation-duration in globals.css. */
const SETTLE_MS = 260;

/**
 * useOliveFigureChange — the "this number changed" signal for a read-only
 * figure: a cart line total, the bag subtotal, a live shipping quote. These
 * re-render with no acknowledgement today; this returns whether the figure
 * should be mid-flash right now, so the caller can add `.olive-figure-settle`
 * for one cycle of `opacity 1 → 0.55 → 1`.
 *
 * Opacity only, on purpose — these are tabular figures being read, not cards
 * arriving, so nothing here may move. Comparison is by value equality
 * (`!==`), so pass whatever uniquely represents the displayed figure: a
 * number for a total, or a composite string when the same slot can show
 * several different states (see the checkout shipping quote).
 *
 * Never flashes on mount — the first render's value seeds the "previous"
 * ref directly, so there is nothing to compare against yet.
 */
export function useOliveFigureChange(value: string | number): boolean {
  const previous = useRef(value);
  const [settling, setSettling] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (previous.current === value) return;
    previous.current = value;
    if (reducedMotion) return;

    setSettling(true);
    const timer = setTimeout(() => setSettling(false), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [value, reducedMotion]);

  return settling;
}
