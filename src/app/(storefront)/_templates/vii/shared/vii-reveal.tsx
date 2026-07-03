"use client";

import { useViiReveal } from "../hooks/use-vii-reveal";

type Props = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** IntersectionObserver threshold — defaults to 0.08 (matches the homepage). */
  threshold?: number;
};

/**
 * Single-block scroll reveal (fade + rise). Thin client wrapper around
 * `useViiReveal` so server components can opt into the vii reveal system by
 * wrapping already-rendered children, without becoming `"use client"`.
 *
 * Progressive enhancement + reduced-motion are handled by the hook and the
 * `.vii-js` / `@media (prefers-reduced-motion)` rules in globals.css.
 */
export function ViiReveal({
  children,
  className,
  style,
  threshold = 0.08,
}: Props) {
  const { ref, visible } = useViiReveal(threshold);
  return (
    <div
      ref={ref}
      className={`vii-reveal${visible ? " is-visible" : ""}${className ? ` ${className}` : ""}`}
      style={style}
    >
      {children}
    </div>
  );
}

/**
 * Staggered reveal group. The container observer lives here; the mapped
 * children must each carry `className="vii-reveal-item"` and
 * `style={{ "--i": Math.min(i, 7) }}` for the cascade.
 */
export function ViiRevealGroup({
  children,
  className,
  style,
  threshold = 0.08,
}: Props) {
  const { ref, visible } = useViiReveal(threshold);
  return (
    <div
      ref={ref}
      className={`vii-reveal-group${visible ? " is-visible" : ""}${className ? ` ${className}` : ""}`}
      style={style}
    >
      {children}
    </div>
  );
}
