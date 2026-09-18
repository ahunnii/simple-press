"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Ambient-motion controller for the cloud/balloon layers (design.md "Motion
 * › Cloud system": "`DreamAmbientController` pauses drift
 * (`animation-play-state`) when the layer is <5% visible").
 *
 * On mount (and on every client-side route change, since `.dream-clouds` /
 * `.dream-balloons` instances belong to page-level server components that
 * get swapped under the persistent `.dream` layout root):
 *
 * 1. Adds `dream-js` to the `.dream` scope root — same progressive-
 *    enhancement gate `use-dream-reveal` uses, so JS-only affordances never
 *    ship broken when JS is off.
 * 2. If the user prefers reduced motion, does nothing else — clouds are
 *    already parked at `--rest` by the scoped
 *    `@media (prefers-reduced-motion: reduce)` CSS, so there is nothing to
 *    observe or pause.
 * 3. Otherwise observes every `.dream-clouds` / `.dream-balloons` element
 *    with an IntersectionObserver (5% threshold) and toggles `data-paused`
 *    — the CSS rule `[data-paused] .dream-cloud { animation-play-state:
 *    paused }` does the actual pausing, so this hook only ever flips an
 *    attribute.
 */
export function useDreamAmbient(): void {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.querySelector(".dream");
    root?.classList.add("dream-js");

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const targets = document.querySelectorAll<HTMLElement>(
      ".dream-clouds, .dream-balloons",
    );
    if (targets.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target;
          if (entry.isIntersecting) {
            el.removeAttribute("data-paused");
          } else {
            el.setAttribute("data-paused", "");
          }
        }
      },
      { threshold: 0.05 },
    );

    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);
}
