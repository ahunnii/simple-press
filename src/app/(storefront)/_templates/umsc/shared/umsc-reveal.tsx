"use client";

import { cn } from "~/lib/utils";

import { useUmscReveal } from "../hooks/use-umsc-reveal";

type Props = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** IntersectionObserver threshold. Default 0.1. */
  threshold?: number;
};

/**
 * Single-block scroll reveal (fade + 10px rise, 550ms). Thin client wrapper
 * around `useUmscReveal` so server components can opt into the umsc reveal
 * system by wrapping already-rendered children, without becoming
 * `"use client"` themselves. Never used on page heroes — they're already in
 * view. Progressive enhancement + reduced-motion are handled by the hook and
 * the `.umsc-js` / `@media (prefers-reduced-motion)` rules in globals.css.
 */
export function UmscReveal({
  children,
  className,
  style,
  threshold = 0.1,
}: Props) {
  const { ref, visible } = useUmscReveal(threshold);
  return (
    <div
      ref={ref}
      className={cn("umsc-reveal", visible && "is-visible", className)}
      style={style}
    >
      {children}
    </div>
  );
}

/**
 * Staggered reveal group. The container observer lives here; mapped children
 * must each carry `className="umsc-reveal-item"` and
 * `style={{ "--i": Math.min(i, 6) } as React.CSSProperties}` for the
 * ≤70ms-per-item cascade (product grids, door rows, review cards, values
 * columns).
 */
export function UmscRevealGroup({
  children,
  className,
  style,
  threshold = 0.1,
}: Props) {
  const { ref, visible } = useUmscReveal(threshold);
  return (
    <div
      ref={ref}
      className={cn("umsc-reveal-group", visible && "is-visible", className)}
      style={style}
    >
      {children}
    </div>
  );
}
