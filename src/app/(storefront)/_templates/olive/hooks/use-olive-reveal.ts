"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * IntersectionObserver scroll-reveal for the olive template — the "dealt card"
 * arrival from design.md § Motion (opacity 0→1, translateY 14px→0, a 0.6°
 * straighten, 600ms on `--olive-ease`, grouped children staggered 60ms).
 *
 * Returns `{ ref, visible }`. Attach `ref` to the element to watch and toggle
 * `is-visible` from `visible` — `<OliveReveal>` / `<OliveRevealGroup>` in
 * `shared/olive-reveal.tsx` do exactly that, and are what components use.
 *
 * Two guarantees the CSS depends on:
 * - **Progressive enhancement.** On mount the hook adds `.olive-js` to the
 *   nearest `.olive` root. Every hidden-state rule is written under
 *   `.olive-js`, so with JS off (or before hydration) content ships visible
 *   instead of blank.
 * - **Reduced motion.** When the user prefers reduced motion the hook returns
 *   `visible: true` immediately and never observes anything.
 */
export function useOliveReveal(threshold = 0.1): {
  ref: (node: HTMLDivElement | null) => void;
  visible: boolean;
} {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  const ref = useCallback((node: HTMLDivElement | null) => {
    if (node) setEl(node);
  }, []);

  useEffect(() => {
    // Arm the system before anything else, so the gate class is present even
    // when we bail out below.
    el?.closest(".olive")?.classList.add("olive-js");

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setVisible(true);
      return;
    }

    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      // Extend the root downward a little so a card straightens just before it
      // is fully on screen, which reads as smoother than firing at the edge.
      { threshold, rootMargin: "0px 0px 10% 0px" },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [threshold, el]);

  return { ref, visible };
}
