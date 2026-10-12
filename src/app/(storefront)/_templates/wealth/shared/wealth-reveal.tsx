"use client";

import { cn } from "~/lib/utils";

import { useWealthReveal } from "../hooks/use-wealth-reveal";

type Props = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** IntersectionObserver threshold — defaults to 0.1 (use 0 for wrappers
   *  taller than the viewport, or they never cross 10%). */
  threshold?: number;
  /** Sibling stagger step (0, 1, 2…) → `--d`; 80ms each, capped at 320ms. */
  delay?: number;
  /** Root element — `section`/`li`/`article` keep semantics when the reveal
   *  wrapper IS the block. Defaults to `div`. */
  as?: "div" | "section" | "li" | "article" | "figure";
} & Omit<React.HTMLAttributes<HTMLElement>, "className" | "style" | "children">;

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
  delay,
  as: Tag = "div",
  ...rest
}: Props) {
  const { ref, visible } = useWealthReveal(threshold);
  return (
    <Tag
      {...rest}
      ref={ref}
      className={cn("wealth-reveal", visible && "is-visible", className)}
      style={
        delay !== undefined
          ? ({ ...style, "--d": delay } as React.CSSProperties)
          : style
      }
    >
      {children}
    </Tag>
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
  delay: _delay,
  as: Tag = "div",
  ...rest
}: Props) {
  const { ref, visible } = useWealthReveal(threshold);
  return (
    <Tag
      {...rest}
      ref={ref}
      className={cn("wealth-reveal-group", visible && "is-visible", className)}
      style={style}
    >
      {children}
    </Tag>
  );
}
