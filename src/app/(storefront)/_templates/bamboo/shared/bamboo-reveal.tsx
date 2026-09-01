"use client";

import { cn } from "~/lib/utils";

import { useBambooReveal } from "../hooks/use-bamboo-reveal";

type Props = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** IntersectionObserver threshold — defaults to design.md's spec (0.1). */
  threshold?: number;
};

/**
 * Single-block scroll reveal (fade + rise). Thin client wrapper around
 * `useBambooReveal` so server components can opt into the bamboo reveal
 * system by wrapping already-rendered children, without becoming
 * `"use client"` themselves — mirrors vii's `ViiReveal`.
 *
 * Progressive enhancement + reduced-motion are handled by the hook and the
 * `.bamboo-js` / `@media (prefers-reduced-motion)` rules in globals.css.
 */
export function BambooReveal({
  children,
  className,
  style,
  threshold = 0.1,
}: Props) {
  const { ref, visible } = useBambooReveal(threshold);
  return (
    <div
      ref={ref}
      className={cn("bamboo-reveal", visible && "in", className)}
      style={style}
    >
      {children}
    </div>
  );
}

/**
 * Staggered reveal group. The container observer lives here; mapped children
 * must each carry `className="bamboo-reveal-item"` and
 * `style={{ "--i": index }}` for the cascade (see the
 * `.bamboo-js .bamboo-reveal-group.in .bamboo-reveal-item` rule in
 * globals.css, which delays each item by `calc(var(--i, 0) * 90ms)`).
 */
export function BambooRevealGroup({
  children,
  className,
  style,
  threshold = 0.1,
}: Props) {
  const { ref, visible } = useBambooReveal(threshold);
  return (
    <div
      ref={ref}
      className={cn("bamboo-reveal-group", visible && "in", className)}
      style={style}
    >
      {children}
    </div>
  );
}
