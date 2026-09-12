"use client";

import { cn } from "~/lib/utils";

import { useOliveReveal } from "../hooks/use-olive-reveal";

type OliveRevealProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** IntersectionObserver threshold — defaults to 0.1. */
  threshold?: number;
};

/**
 * Single-block scroll reveal. A thin client wrapper around `useOliveReveal`
 * so server components can opt into the reveal by wrapping already-rendered
 * children, without becoming `"use client"` themselves.
 *
 * Progressive enhancement and reduced motion are handled by the hook plus the
 * `.olive-js` / `@media (prefers-reduced-motion: reduce)` rules in globals.css
 * — never add your own transition on top of this.
 */
export function OliveReveal({
  children,
  className,
  style,
  threshold = 0.1,
}: OliveRevealProps) {
  const { ref, visible } = useOliveReveal(threshold);
  return (
    <div
      ref={ref}
      className={cn("olive-reveal", visible && "is-visible", className)}
      style={style}
    >
      {children}
    </div>
  );
}

type OliveRevealGroupProps = OliveRevealProps & {
  /**
   * Fan the group: alternate children lean the opposite way (+0.6°) before
   * straightening, so a row of cards arrives like a hand being dealt. Use it
   * for card rows and grids; leave it off for stacked text blocks.
   */
  fan?: boolean;
};

/**
 * Staggered reveal group. The observer lives on the container; every mapped
 * child must carry `className="olive-reveal-item"` and
 * `style={{ "--i": Math.min(i, 8) } as React.CSSProperties}` for the 60ms
 * cascade (delay is capped at 480ms, so an index above 8 changes nothing).
 */
export function OliveRevealGroup({
  children,
  className,
  style,
  threshold = 0.1,
  fan = false,
}: OliveRevealGroupProps) {
  const { ref, visible } = useOliveReveal(threshold);
  return (
    <div
      ref={ref}
      className={cn(
        "olive-reveal-group",
        fan && "olive-fan",
        visible && "is-visible",
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}
