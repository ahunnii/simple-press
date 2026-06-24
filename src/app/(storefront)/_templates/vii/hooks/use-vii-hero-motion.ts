"use client";

import { useEffect, useState } from "react";

const EASE = "var(--vii-ease)";

/**
 * useViiHeroMotion — mount-gated entrance state for full-bleed hero sections.
 *
 * Returns `shown` (flips true after a 60ms tick so the CSS transition fires)
 * and `reduced` (true when the user prefers reduced motion). Pass both values
 * to the pure style builders below to compose the cinematic entrance.
 */
export function useViiHeroMotion(): { shown: boolean; reduced: boolean } {
  const [shown, setShown] = useState(false);
  const [reduced, setReduced] = useState(false);

  // Entrance animation — 60ms delay gives the browser one paint before
  // triggering, so the opacity/transform transitions actually fire.
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 60);
    return () => clearTimeout(t);
  }, []);

  // Honour prefers-reduced-motion: collapse all entrance motion to end state.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setReduced(true);
    }
  }, []);

  return { shown, reduced };
}

/**
 * heroRevealStyle — staggered fade-rise for overline, CTA, and other blocks.
 * Default delay 0s (overline beat); pass 0.3 for CTA beat.
 */
export function heroRevealStyle(
  shown: boolean,
  reduced: boolean,
  delay = 0,
): React.CSSProperties {
  if (reduced) return { opacity: 1 };
  return {
    opacity: shown ? 1 : 0,
    transform: shown ? "translateY(0)" : "translateY(20px)",
    transition: `opacity 0.9s ${EASE} ${delay}s, transform 0.9s ${EASE} ${delay}s`,
  };
}

/**
 * heroHeadingStyle — clip-path line-reveal for the page's h1.
 * Default delay 0.15s (heading beat).
 */
export function heroHeadingStyle(
  shown: boolean,
  reduced: boolean,
  delay = 0.15,
): React.CSSProperties {
  // paddingBottom gives the clip-path (border-box reference) room below the
  // baseline so Playfair descenders (g/y/p) aren't shaved by inset(0 0 0% 0).
  if (reduced) return { opacity: 1, clipPath: "none", paddingBottom: "0.18em" };
  return {
    opacity: shown ? 1 : 0,
    clipPath: shown ? "inset(0 0 0% 0)" : "inset(0 0 110% 0)",
    transform: shown ? "translateY(0)" : "translateY(12px)",
    paddingBottom: "0.18em",
    transition: `opacity 0.95s ${EASE} ${delay}s, clip-path 0.95s ${EASE} ${delay}s, transform 0.95s ${EASE} ${delay}s`,
  };
}

/**
 * heroMediaStyle — slow Ken-Burns scale-settle for background media layers.
 * Wrap the media in an overflow:hidden container and apply this to that wrapper.
 */
export function heroMediaStyle(
  shown: boolean,
  reduced: boolean,
): React.CSSProperties {
  if (reduced) return { transform: "scale(1)" };
  return {
    transform: shown ? "scale(1)" : "scale(1.08)",
    transition: `transform 2.2s ${EASE}`,
  };
}
