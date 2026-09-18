"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Lightweight IntersectionObserver-based scroll-reveal hook (copied
 * verbatim, renamed, from `wealth/hooks/use-wealth-reveal.ts` per
 * design.md's "Reveals" spec: single-pass opacity+12px rise, 0.6s ease-out,
 * ≤80ms stagger only where a list appears as a list).
 *
 * Returns `{ ref, visible }`. Attach `ref` to the element to watch, then
 * toggle the `is-visible` class based on `visible`.
 *
 * Respects `prefers-reduced-motion`: when the user prefers reduced motion the
 * hook immediately returns `visible: true` and never sets up an observer, so
 * the element is always fully visible without animation.
 */
export function useDreamReveal(threshold = 0.1): {
  ref: (node: HTMLDivElement | null) => void;
  visible: boolean;
} {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  const ref = useCallback((node: HTMLDivElement | null) => {
    if (node) setEl(node);
  }, []);

  useEffect(() => {
    // Arm the reveal system: the `.dream-js` flag gates the hidden state in
    // CSS, so without JS (or before this effect runs) content stays fully
    // visible rather than shipping blank. Added to the scope root on mount.
    el?.closest(".dream")?.classList.add("dream-js");

    // Honour the user's motion preference — skip animation entirely.
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
      // Slightly extend the root downward so content reveals just before it
      // scrolls fully into view, which reads as smoother.
      { threshold, rootMargin: "0px 0px 10% 0px" },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [threshold, el]);

  return { ref, visible };
}
