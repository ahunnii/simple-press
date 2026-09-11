"use client";

import { cn } from "~/lib/utils";

import { useWealthReveal } from "../hooks/use-wealth-reveal";

type Props = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** IntersectionObserver threshold — defaults to 0.1. */
  threshold?: number;
};

/**
 * Single-block scroll reveal (fade + 12px rise). Thin client wrapper around
 * `useWealthReveal` so server components can opt into the wealth reveal
 * system by wrapping already-rendered children, without becoming
 * `"use client"` themselves. Structurally copied from `vii/shared/vii-reveal.tsx`.
 *
 * Progressive enhancement + reduced-motion are handled by the hook and the
 * `.wealth-js` / `@media (prefers-reduced-motion)` rules in globals.css.
 */
export function WealthReveal({
  children,
  className,
  style,
  threshold = 0.1,
}: Props) {
  const { ref, visible } = useWealthReveal(threshold);
  return (
    <div
      ref={ref}
      className={cn("wealth-reveal", visible && "is-visible", className)}
      style={style}
    >
      {children}
    </div>
  );
}

/**
 * Staggered reveal group. The container observer lives here; mapped
 * children must each carry `className="wealth-reveal-item"` and
 * `style={{ "--i": Math.min(i, 7) }}` for the cascade (≤80ms per item).
 */
export function WealthRevealGroup({
  children,
  className,
  style,
  threshold = 0.1,
}: Props) {
  const { ref, visible } = useWealthReveal(threshold);
  return (
    <div
      ref={ref}
      className={cn("wealth-reveal-group", visible && "is-visible", className)}
      style={style}
    >
      {children}
    </div>
  );
}
