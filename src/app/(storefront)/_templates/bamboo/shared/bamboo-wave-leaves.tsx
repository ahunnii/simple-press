import { cn } from "~/lib/utils";

import { BambooLeafSprig } from "./bamboo-leaf-sprig";

/**
 * Leaves grow where the gold wave meets forest (docs/templates/bamboo/design.md,
 * signature moment #3). These two primitives are the shared "wave sprig"
 * markup used by the value band, the sustainability band's top wave, the
 * About CTA's top wave and the footer lip.
 *
 * Hook-free and free of `"use client"`, like `BambooLeafSprig` and
 * `BambooWaveDivider`, so server and client sections can both import it.
 */

/**
 * The decoration layer: an `aria-hidden`, `pointer-events-none` box covering
 * its positioned parent (`absolute inset-0`). Callers own the z-index and
 * make the parent `relative` (plus `overflow-x-clip` if a sprig could reach
 * past the viewport edge). Children are `BambooWaveSprig`s or any other
 * absolutely positioned `BambooLeafSprig`.
 */
export function BambooWaveLeaves({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 select-none",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * One sprig rooted just under a wave's gold line at the left or right edge,
 * fanning up over it. It is `-translate-y-full`, so its `top-*` class is the
 * ROOT's depth measured from the layer's top edge (which callers line up with
 * the wave's top edge). The right sprig is mirrored so both fan inboard.
 * Callers pass the root depth and width, for example `top-11 w-28 md:top-16
 * md:w-36`.
 */
export function BambooWaveSprig({
  side,
  className,
}: {
  side: "left" | "right";
  className?: string;
}) {
  return (
    <BambooLeafSprig
      flip={side === "right"}
      className={cn(
        "absolute -translate-y-full",
        side === "left" ? "left-0" : "right-0",
        className,
      )}
    />
  );
}

/**
 * Root depths for the band-scale wave (`h-14 md:h-24`), where the gold line
 * sits at 60/120 of the wave's height on the left edge and 50/120 on the
 * right. Each root sits ~20px under the line, so the twig's bare base is on
 * forest and the blades cross the gold. Shared by the value band,
 * sustainability top and About CTA top so the three read as one system.
 */
export const BAND_WAVE_SPRIG_ROOT = {
  left: "top-12 md:top-[4.5rem]",
  right: "top-11 md:top-16",
} as const;

/**
 * The default band sprig size, the value band's own base size. Sections
 * without the value band's hero-clearance constraints use it at every width.
 */
export const BAND_WAVE_SPRIG_SIZE = "w-28 md:w-36";
