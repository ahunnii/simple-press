"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";

/**
 * Single-pass IntersectionObserver scroll reveal for the glove template.
 *
 * Returns `{ ref, visible }`. Attach `ref` to the element to watch and toggle
 * `is-visible` from `visible`. The first mount arms the `.glove-js` gate on
 * the template scope root: reveal styles only exist under `.glove-js`, so
 * content is fully visible without JS.
 *
 * `threshold` defaults to 0.1. Pass `0` for tall wrappers (a 10% sliver of a
 * very tall block may never fit in the viewport on small screens).
 *
 * A block already in the viewport on first paint is marked visible in the same
 * layout pass that arms `.glove-js` (before the browser paints), so above-fold
 * content never flickers hidden -> visible. Only blocks below the fold animate.
 *
 * Under `prefers-reduced-motion: reduce` no observer is created and
 * `visible` is true immediately (everything renders settled).
 */
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Mirrors the observer below: threshold ratio inside a viewport grown 8% down. */
function isInInitialViewport(el: HTMLElement, threshold: number): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  const bottomEdge = window.innerHeight * 1.08;
  const shown = Math.min(rect.bottom, bottomEdge) - Math.max(rect.top, 0);
  if (shown <= 0) return false;
  if (threshold <= 0 || rect.height === 0) return true;
  return shown / rect.height >= threshold;
}

export function useGloveReveal(threshold = 0.1): {
  ref: (node: HTMLDivElement | null) => void;
  visible: boolean;
} {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  const ref = useCallback((node: HTMLDivElement | null) => {
    if (node) setEl(node);
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (!el) return;
    // Measure before arming the gate so the rect is the un-offset position.
    const aboveFold = isInInitialViewport(el, threshold);
    el.closest(".glove")?.classList.add("glove-js");

    if (aboveFold) {
      setVisible(true);
      return;
    }

    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setVisible(true);
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px 8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, el]);

  return { ref, visible };
}
