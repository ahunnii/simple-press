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
 * `"use client"` themselves. Structurally copied from
 * `wealth/shared/wealth-reveal.tsx`.
 *
 * Progressive enhancement + reduced-motion are handled by the hook and the
 * `.dream-js` / `@media (prefers-reduced-motion)` rules in globals.css.
 */
export function DreamReveal({
  children,
  className,
  style,
  threshold = 0.1,
}: Props) {
  const { ref, visible } = useDreamReveal(threshold);
  return (
    <div
      ref={ref}
      className={cn("dream-reveal", visible && "is-visible", className)}
      style={style}
    >
      {children}
    </div>
  );
}

/**
 * Staggered reveal group. The container observer lives here; mapped
 * children must each carry `className="dream-reveal-item"` and
 * `style={{ "--i": Math.min(i, 7) }}` for the cascade (≤80ms per item) —
 * used for packages and `DreamSteps` (design.md "Reveals").
 */
export function DreamRevealGroup({
  children,
  className,
  style,
  threshold = 0.1,
}: Props) {
  const { ref, visible } = useDreamReveal(threshold);
  return (
    <div
      ref={ref}
      className={cn("dream-reveal-group", visible && "is-visible", className)}
      style={style}
    >
      {children}
    </div>
  );
}
