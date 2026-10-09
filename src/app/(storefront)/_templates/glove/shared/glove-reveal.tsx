"use client";

import type { CSSProperties, ReactNode } from "react";

import { cn } from "~/lib/utils";

import { useGloveReveal } from "../hooks/use-glove-reveal";

type GloveRevealProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** IntersectionObserver threshold. Use 0 for tall wrappers. Default 0.1. */
  threshold?: number;
};

/**
 * Single-block reveal (fade + 16px rise). Thin client wrapper so server
 * components can opt in by wrapping already-rendered children. Never wrap a
 * form in a reveal.
 */
export function GloveReveal({
  children,
  className,
  style,
  threshold = 0.1,
}: GloveRevealProps) {
  const { ref, visible } = useGloveReveal(threshold);
  return (
    <div
      ref={ref}
      className={cn("glove-reveal", visible && "is-visible", className)}
      style={style}
    >
      {children}
    </div>
  );
}

/**
 * Staggered reveal group. One observer on the container; each mapped child
 * carries `className="glove-reveal-item"` and `style={{ "--i": index }}`
 * (use `gloveRevealItemStyle(i)`), 70ms apart, capped at 350ms. Descendants
 * with `.glove-pop` (step medallions) pop in on a 90ms stagger by `--i`.
 */
export function GloveRevealGroup({
  children,
  className,
  style,
  threshold = 0.1,
}: GloveRevealProps) {
  const { ref, visible } = useGloveReveal(threshold);
  return (
    <div
      ref={ref}
      className={cn("glove-reveal-group", visible && "is-visible", className)}
      style={style}
    >
      {children}
    </div>
  );
}
