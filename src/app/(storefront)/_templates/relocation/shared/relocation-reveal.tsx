"use client";

import { cn } from "~/lib/utils";

import { useRelocationReveal } from "../hooks/use-relocation-reveal";

type Props = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** IntersectionObserver threshold — defaults to 0.08 (matches vii's pages). */
  threshold?: number;
};

/**
 * Single-block scroll reveal (fade + gentle rise). Thin client wrapper around
 * `useRelocationReveal` so server components can opt into the reveal system by
 * wrapping already-rendered children, without becoming `"use client"`.
 *
 * Progressive enhancement + reduced-motion are handled by the hook and the
 * `.relocation-js` / `@media (prefers-reduced-motion)` rules in globals.css.
 */
export function RelocationReveal({
  children,
  className,
  style,
  threshold = 0.08,
}: Props) {
  const { ref, visible } = useRelocationReveal(threshold);
  return (
    <div
      ref={ref}
      className={cn("relocation-reveal", visible && "is-visible", className)}
      style={style}
    >
      {children}
    </div>
  );
}

/**
 * Staggered reveal group. The container observer lives here; the mapped
 * children must each carry `className="relocation-reveal-item"` and
 * `style={{ "--i": Math.min(i, 7) }}` for the cascade.
 */
export function RelocationRevealGroup({
  children,
  className,
  style,
  threshold = 0.08,
}: Props) {
  const { ref, visible } = useRelocationReveal(threshold);
  return (
    <div
      ref={ref}
      className={cn(
        "relocation-reveal-group",
        visible && "is-visible",
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}
