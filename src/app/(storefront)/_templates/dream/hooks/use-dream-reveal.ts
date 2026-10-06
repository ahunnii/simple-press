"use client";

import type { RefObject } from "react";
import { useLayoutEffect, useRef, useState } from "react";

/**
 * IntersectionObserver-based scroll-reveal hook for the dream template
 * (design.md "Reveals": single-pass opacity + 12px rise, ease-out, ≤80ms
 * stagger only where a list appears as a list).
 *
 * Per-element phase state, no root gate — ported from
 * `animated-bamboo/hooks/use-bamboo-reveal.ts`. This hook used to add
 * `.dream-js` to the `.dream` scope root in a passive `useEffect` and CSS hid
 * every `.dream-js .dream-reveal`. That armed the hidden state *after* first
 * paint: SSR content painted visible, snapped hidden right after hydration,
 * then faded back in (a visible flash), and anything already on screen had
 * to wait on the observer to show at all. `phase` fixes that per element:
 *
 * - "idle": untouched. SSR/no-JS output, `prefers-reduced-motion`, no
 *   `IntersectionObserver` support, or the element was already on screen at
 *   mount. CSS renders a bare `.dream-reveal` visible, as-is.
 * - "out": measured off-screen at mount. `.out` hides it (no transition)
 *   until the observer fires.
 * - "in": the observer fired. `.in` carries the reveal transition.
 *
 * `setPhase("out")` runs inside `useLayoutEffect` rather than `useEffect` on
 * purpose: React 19 flushes layout-effect state updates synchronously before
 * the browser paints — including during the hydration commit — so an
 * off-screen element is hidden before its first paint (never
 * visible-then-hidden) and an on-screen element is never hidden at all.
 * (React 19 also dropped the SSR `useLayoutEffect` warning.)
 *
 * The `.dream-js` root class still exists, but only `use-dream-ambient.ts`
 * adds it now, and no reveal rule depends on it.
 */
export type DreamRevealPhase = "idle" | "out" | "in";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Any part of `el` inside the layout viewport right now (deliberately looser than the observer). */
const isOnScreenNow = (el: Element) => {
  const r = el.getBoundingClientRect();
  return (
    r.bottom > 0 &&
    r.top < window.innerHeight &&
    r.right > 0 &&
    r.left < window.innerWidth
  );
};

export function useDreamReveal(threshold = 0.1): {
  ref: RefObject<HTMLDivElement | null>;
  phase: DreamRevealPhase;
} {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<DreamRevealPhase>("idle");

  // Layout effect on purpose — see the doc comment above.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined")
      return; // stay idle = visible
    if (isOnScreenNow(el)) return; // already visible: never hide, never animate

    setPhase("out");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        // A wrapper taller than root-height / threshold can never reach its
        // ratio (the populated gallery stacks to ~5700px on phones), so it
        // would stay hidden forever — those reveal as soon as they enter.
        const rootHeight = entry.rootBounds?.height ?? window.innerHeight;
        const unreachable =
          entry.boundingClientRect.height * threshold >= rootHeight;
        if (entry.intersectionRatio >= threshold || unreachable) {
          setPhase("in");
          io.disconnect();
        }
      },
      // Extend the root downward (unlike bamboo's -10%) so content reveals
      // just before it scrolls fully into view — dream's existing feel. The
      // 0 step makes the observer report entry, for the unreachable case.
      { threshold: [0, threshold], rootMargin: "0px 0px 10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, phase };
}
