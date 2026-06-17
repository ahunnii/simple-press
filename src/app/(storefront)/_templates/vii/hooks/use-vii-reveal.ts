"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Lightweight IntersectionObserver-based scroll-reveal hook.
 *
 * Returns `{ ref, visible }`. Attach `ref` to the element you want to watch,
 * then toggle the `is-visible` class (or inline styles) based on `visible`.
 *
 * Respects `prefers-reduced-motion`: when the user prefers reduced motion the
 * hook immediately returns `visible: true` and never sets up an observer, so
 * the element is always fully visible without animation.
 */
export function useViiReveal(threshold = 0.1): {
  ref: React.RefObject<HTMLDivElement | null>;
  visible: boolean;
} {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Honour the user's motion preference — skip animation entirely.
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setVisible(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, visible };
}
