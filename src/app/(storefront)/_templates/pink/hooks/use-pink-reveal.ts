"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * PinkArt scroll-reveal hook (design.md → Motion → "Scroll reveal").
 *
 * An IntersectionObserver watches the attached node and reveals it with a
 * `70ms × index` stagger once it crosses `rootMargin: "0px 0px -8% 0px"` at
 * `threshold: 0.06`. A passive `scroll` "sweep" pass force-reveals anything
 * already scrolled past (`getBoundingClientRect().bottom < 0`) so
 * back-navigation never leaves blank regions above the fold.
 *
 * Also arms the `.pink-js` gate class on the nearest `.pink` ancestor so the
 * CSS-only entrance animations (`.pink-anim-*`) and the `.pink-reveal` /
 * `.pink-revealed` transition pair only run once JS is confirmed present —
 * content stays fully visible without JS (progressive enhancement).
 *
 * Respects `prefers-reduced-motion`: returns `revealed: true` immediately and
 * never sets up an observer.
 */
const REVEAL_ROOT_MARGIN = "0px 0px -8% 0px";
const REVEAL_THRESHOLD = 0.06;
const STAGGER_MS = 70;

export function usePinkReveal(index = 0): {
  ref: (node: HTMLElement | null) => void;
  revealed: boolean;
} {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ref = useCallback((node: HTMLElement | null) => {
    if (node) setEl(node);
  }, []);

  useEffect(() => {
    el?.closest(".pink")?.classList.add("pink-js");

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setRevealed(true);
      return;
    }

    if (!el) return;

    const scheduleReveal = () => {
      if (timeoutRef.current) return;
      timeoutRef.current = setTimeout(
        () => setRevealed(true),
        Math.max(0, index) * STAGGER_MS,
      );
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          scheduleReveal();
          io.disconnect();
        }
      },
      { rootMargin: REVEAL_ROOT_MARGIN, threshold: REVEAL_THRESHOLD },
    );
    io.observe(el);

    // Sweep pass — force-reveal anything already scrolled past so
    // back-navigation (or a mid-page deep link) never leaves blank regions.
    const sweep = () => {
      const rect = el.getBoundingClientRect();
      if (rect.bottom < 0) {
        setRevealed(true);
        io.disconnect();
      }
    };
    sweep();
    window.addEventListener("scroll", sweep, { passive: true });

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", sweep);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [el, index]);

  return { ref, revealed };
}
