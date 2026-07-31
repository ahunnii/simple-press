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
          stop();
        }
      },
      { rootMargin: REVEAL_ROOT_MARGIN, threshold: REVEAL_THRESHOLD },
    );
    io.observe(el);

    // Single teardown for every path. Previously only the observer was
    // disconnected on reveal while the passive `scroll` listener was removed
    // on unmount, so each revealed element kept a listener calling
    // `getBoundingClientRect()` for the page's lifetime — 14 on `/`, 13 on
    // `/about` (audit 2026-07-31, P3-3). Measured cost was low (the sweep only
    // reads, so it never forced a layout), so this is cleanliness, not a perf
    // fix. Safe to call more than once: both operations are idempotent.
    // Declared before `sweep` so the immediate `sweep()` below can call it.
    const stop = () => {
      io.disconnect();
      window.removeEventListener("scroll", sweep);
    };

    // Sweep pass — force-reveal anything already scrolled past so
    // back-navigation (or a mid-page deep link) never leaves blank regions.
    const sweep = () => {
      const rect = el.getBoundingClientRect();
      if (rect.bottom < 0) {
        setRevealed(true);
        stop();
      }
    };
    // Attach BEFORE the first synchronous sweep. If that sweep immediately
    // reveals (element already scrolled past) it calls `stop()`, and a
    // `removeEventListener` for a listener that had not been added yet is a
    // no-op — so attaching afterwards would re-leak the listener for exactly
    // the case P3-3 set out to fix. This order makes `stop()` authoritative
    // whenever it runs.
    window.addEventListener("scroll", sweep, { passive: true });
    sweep();

    return () => {
      stop();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [el, index]);

  return { ref, revealed };
}
