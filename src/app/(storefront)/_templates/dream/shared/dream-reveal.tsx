"use client";

import { cn } from "~/lib/utils";

import { useDreamReveal } from "../hooks/use-dream-reveal";

type Props = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** IntersectionObserver threshold — defaults to 0.1. */
  threshold?: number;
};

/**
 * Single-block scroll reveal (fade + 12px rise). Thin client wrapper around
 * `useDreamReveal` so server components can opt into the dream reveal
 * system by wrapping already-rendered children, without becoming
 * `"use client"` themselves.
 *
 * Renders one of three phase classes alongside the base `dream-reveal`
 * class: no extra class while `"idle"` (SSR/no-JS/reduced-motion/already on
 * screen — CSS shows it as-is), `"out"` while off-screen and armed (CSS
 * hides it with no transition), `"in"` once the observer has fired (CSS
 * carries the reveal transition). A lone reveal can be staggered against a
 * sibling by passing `style={{ "--i": n }}` (80ms per step, same as group
 * items). See `use-dream-reveal.ts` for why the phase is set in a layout
 * effect instead of a root `.dream-js` gate.
 */
export function DreamReveal({
  children,
  className,
  style,
  threshold = 0.1,
}: Props) {
  const { ref, phase } = useDreamReveal(threshold);
  return (
    <div
      ref={ref}
      className={cn("dream-reveal", phase !== "idle" && phase, className)}
      style={style}
    >
      {children}
    </div>
  );
}

/**
 * Staggered reveal group. The container observer lives here; mapped
 * children must each carry `className="dream-reveal-item"` and
 * `style={{ "--i": Math.min(i, 7) }}` (cap 7) for the cascade — the
 * `.dream-reveal-group.in .dream-reveal-item` rule in globals.css delays
 * each item by `calc(var(--i, 0) * 80ms)`. Used for packages and
 * `DreamSteps` (design.md "Reveals").
 */
export function DreamRevealGroup({
  children,
  className,
  style,
  threshold = 0.1,
}: Props) {
  const { ref, phase } = useDreamReveal(threshold);
  return (
    <div
      ref={ref}
      className={cn("dream-reveal-group", phase !== "idle" && phase, className)}
      style={style}
    >
      {children}
    </div>
  );
}
