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
 * Renders one of three phase classes alongside the base `bamboo-reveal`
 * class: no extra class while `"idle"` (SSR/no-JS/reduced-motion/already
 * on screen — CSS shows it as-is), `"out"` while off-screen and armed (CSS
 * hides it with no transition), `"in"` once the observer has fired (CSS
 * carries the reveal transition). See `use-bamboo-reveal.ts` for why the
 * phase is set in a layout effect instead of a root `.bamboo-js` gate.
 */
export function BambooReveal({
  children,
  className,
  style,
  threshold = 0.1,
}: Props) {
  const { ref, phase } = useBambooReveal(threshold);
  return (
    <div
      ref={ref}
      className={cn("bamboo-reveal", phase !== "idle" && phase, className)}
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
 * `.bamboo-reveal-group.in .bamboo-reveal-item` rule in globals.css, which
 * delays each item by `calc(var(--i, 0) * 90ms)`).
 */
export function BambooRevealGroup({
  children,
  className,
  style,
  threshold = 0.1,
}: Props) {
  const { ref, phase } = useBambooReveal(threshold);
  return (
    <div
      ref={ref}
      className={cn(
        "bamboo-reveal-group",
        phase !== "idle" && phase,
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}
