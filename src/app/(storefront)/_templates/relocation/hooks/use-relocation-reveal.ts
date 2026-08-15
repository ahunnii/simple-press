"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Lightweight IntersectionObserver-based scroll-reveal hook (port of the vii
 * house pattern — `_templates/vii/hooks/use-vii-reveal.ts` — with the scope
 * class swapped to `.relocation` / `.relocation-js`).
 *
 * Returns `{ ref, visible }`. Attach `ref` to the element you want to watch,
 * then toggle the `is-visible` class based on `visible`.
 *
 * Two safety contracts, both required by design.md → Motion:
 *  - **No-JS safe**: the hidden state in globals.css is gated behind
 *    `.relocation-js`, which is only ever added here (client-side, on first
 *    mount). With JS off nothing is hidden, so the page never ships blank.
 *  - **Reduced-motion safe**: when the user prefers reduced motion the hook
 *    returns `visible: true` immediately and never creates an observer.
 */
export function useRelocationReveal(threshold = 0.1): {
  ref: (node: HTMLDivElement | null) => void;
  visible: boolean;
} {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  const ref = useCallback((node: HTMLDivElement | null) => {
    if (node) setEl(node);
  }, []);

  useEffect(() => {
    // Arm the reveal system on the scope root.
    el?.closest(".relocation")?.classList.add("relocation-js");

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
