"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * IntersectionObserver-based scroll-reveal hook for the bamboo template.
 * Pattern ported from vii's `use-vii-reveal.ts`, with the rootMargin/threshold
 * pinned to design.md's spec (and the mockup's own script): a callback ref
 * arms observation, `.bamboo-js` is added to the nearest `.bamboo` scope root
 * on mount (progressive enhancement — without this class every
 * `.bamboo-reveal` element renders fully visible, see the
 * `.bamboo-js .bamboo-reveal` rule in globals.css), and
 * `prefers-reduced-motion` skips the observer entirely and reveals
 * immediately.
 */
export function useBambooReveal(threshold = 0.1): {
  ref: (node: HTMLDivElement | null) => void;
  visible: boolean;
} {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  const ref = useCallback((node: HTMLDivElement | null) => {
    if (node) setEl(node);
  }, []);

  useEffect(() => {
    el?.closest(".bamboo")?.classList.add("bamboo-js");

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
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [threshold, el]);

  return { ref, visible };
}

/**
 * Generic IntersectionObserver hook sharing the same mechanics as
 * `useBambooReveal` (arms `.bamboo-js`, honors reduced motion), for elements
 * that need raw `inView` state rather than a ready-made visible/hidden
 * toggle — the why-bamboo timeline's `.drawn` class and the location map's
 * pin-drop trigger (both built next wave). Defaults to the mockup's timeline
 * threshold (0.2, no rootMargin extension) rather than the reveal system's.
 */
export function useBambooInView(threshold = 0.2): {
  ref: (node: HTMLDivElement | null) => void;
  inView: boolean;
} {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  const ref = useCallback((node: HTMLDivElement | null) => {
    if (node) setEl(node);
  }, []);

  useEffect(() => {
    el?.closest(".bamboo")?.classList.add("bamboo-js");

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setInView(true);
      return;
    }

    if (!el) return;

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
  }, [threshold, el]);

  return { ref, inView };
}
