"use client";

import { useCallback, useEffect, useState } from "react";

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
 * Under `prefers-reduced-motion: reduce` no observer is created and
 * `visible` is true immediately (everything renders settled).
 */
export function useGloveReveal(threshold = 0.1): {
  ref: (node: HTMLDivElement | null) => void;
  visible: boolean;
} {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  const ref = useCallback((node: HTMLDivElement | null) => {
    if (node) setEl(node);
  }, []);

  useEffect(() => {
    if (!el) return;
    el.closest(".glove")?.classList.add("glove-js");

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
