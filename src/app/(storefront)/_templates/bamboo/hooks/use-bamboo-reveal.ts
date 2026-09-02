"use client";

import type { RefObject } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * IntersectionObserver-based scroll-reveal hook for the bamboo template.
 *
 * Per-element phase state, no root gate. There is no `.bamboo-js` class
 * added to the `.bamboo` scope root anymore — that pattern armed the hidden
 * state in a passive `useEffect` (after first paint), which meant SSR
 * content painted visible, then snapped hidden right after hydration, and
 * anything already scrolled into view had to wait on the observer before it
 * would show at all. `phase` fixes that per element instead:
 *
 * - "idle": untouched. SSR/no-JS output, `prefers-reduced-motion`, no
 *   `IntersectionObserver` support, or the element was already on screen at
 *   mount. CSS renders an `idle` (bare `.bamboo-reveal`) element visible,
 *   as-is — nothing to hide.
 * - "out": measured off-screen at mount. `.out` hides it (no transition)
 *   until the observer fires.
 * - "in": the observer fired. `.in` carries the reveal transition.
 *
 * The `setPhase("out")` transition runs inside `useLayoutEffect` rather than
 * `useEffect` on purpose: React 19 flushes layout-effect state updates
 * synchronously before the browser paints — including during the hydration
 * commit — so an off-screen element is hidden before its first paint
 * (never visible-then-hidden) and an on-screen element is never hidden at
 * all. (React 19 also dropped the SSR `useLayoutEffect` warning, so this is
 * safe to use in a component that renders during SSR.)
 */
export type BambooRevealPhase = "idle" | "out" | "in";

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

export function useBambooReveal(threshold = 0.1): {
  ref: RefObject<HTMLDivElement | null>;
  phase: BambooRevealPhase;
} {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<BambooRevealPhase>("idle");

  // Layout effect on purpose: `setPhase("out")` is flushed before paint, so
  // an off-screen element is never painted visible-then-hidden, and an
  // element already on screen is never hidden at all (SSR content must not
  // flash).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined")
      return; // stay idle = visible
    if (isOnScreenNow(el)) return; // already visible: never hide, never animate

    setPhase("out");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setPhase("in");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, phase };
}

/**
 * Generic IntersectionObserver hook sharing the reduced-motion handling of
 * `useBambooReveal`, for elements that need raw `inView` state rather than a
 * ready-made phase toggle — the why-bamboo timeline's `.drawn` class and the
 * location map's pin-drop trigger. Defaults to the mockup's timeline
 * threshold (0.2, no rootMargin extension) rather than the reveal system's.
 *
 * Stays a passive `useEffect` on purpose: its consumers
 * (`homepage/sections/bamboo-home-why-bamboo.tsx`,
 * `about/bamboo-reach-timeline.tsx`) are hidden by their own unconditional
 * CSS (not gated by a root `.bamboo-js` class), so there is no SSR-visible
 * flash for a layout effect to prevent here.
 */
export function useBambooInView(threshold = 0.2): {
  ref: RefObject<HTMLDivElement | null>;
  inView: boolean;
} {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, inView };
}
