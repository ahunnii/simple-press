"use client";

import { cn } from "~/lib/utils";

import { useBambooInView } from "../hooks/use-bamboo-reveal";

/**
 * Thin client wrapper for the "From Detroit to Your Door" reach band
 * (about.nationwide). Mirrors the mockup's `#tl` element (`.tl` / `.tl.drawn`)
 * but WITHOUT the drawing-culm SVG path — design.md is explicit that this
 * band uses fixed illustrated discs, "no drawing culm" — so all `.drawn`
 * needs to gate here is the `.bamboo-station` stagger-in transition.
 */
export function BambooReachTimeline({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { ref, inView } = useBambooInView(0.2);
  return (
    <div
      ref={ref}
      className={cn("bamboo-timeline", inView && "drawn", className)}
    >
      {children}
    </div>
  );
}
