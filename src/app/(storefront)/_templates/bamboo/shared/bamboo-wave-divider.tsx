import { useId } from "react";

import { cn } from "~/lib/utils";

type Props = {
  /** Body (lower) wave fill. Token strings only — never a color literal. */
  fill?: string;
  /** Lip (upper) wave fill, riding a shade above the body. Tokens only. */
  lip?: string;
  /** Body opacity. 0.32 with a gold-soft `fill` gives the ghost variant. */
  fillOpacity?: number;
  /** Lip opacity. 0.18 with a gold-soft `lip` gives the ghost variant. */
  lipOpacity?: number;
  /**
   * Rotate 180° so the fill hugs the TOP edge and the transparent area falls
   * below — the band-bottom edge. Deliberately a rotation, not a vertical
   * mirror: the crest has to land on the opposite side.
   */
  flip?: boolean;
  /** Merged onto the svg. Callers own height and seam-insurance margin. */
  className?: string;
  /**
   * `"hairline"`: skip the filled lip entirely and trace the body's own top
   * edge as an open, unfilled stroke instead (the vivid metallic gold line).
   * Every gold-border placement uses it: value band, sustainability band
   * (both edges), About CTA top and the footer lip. `"lip"` (default, kept
   * for API stability): the older filled lip + body; its only remaining
   * caller is the About page's Detroit "ghost" wave, which passes gold-soft
   * `lip`/`fill` at 0.18/0.32 opacity as a faint decoration, not a border.
   */
  variant?: "lip" | "hairline";
};

/**
 * BambooWaveDivider — the template's canonical gold-lip → forest wave, bamboo's
 * third signature moment (docs/templates/bamboo/design.md "Signature moments").
 * This geometry is the single source of truth: the homepage value band and
 * sustainability band, the about page's CTA and Detroit ghost wave, and the
 * footer all ride these two curves. Every gold-border placement is
 * `variant="hairline"`; only the Detroit ghost still uses the filled `"lip"`.
 *
 * Inline `aria-hidden` SVG art is a RECORDED deliberate divergence from the
 * happy-bamboo lineage (design.md, "Deliberate divergences") — the client mockup
 * is built on it, so it stays. Fills ride `var(--bam-*)` tokens, never literals:
 * this component hardcodes no color, every fill arrives through a prop default.
 *
 * Both paths close on the viewBox floor, so the area ABOVE the curve is
 * transparent and the divider composites over whatever section precedes it.
 * Callers supply height (`h-14 md:h-24`) and seam insurance (`-mb-px` normal,
 * `-mt-px` flipped) so no hairline opens at fractional zoom levels.
 *
 * Free of `"use client"` on purpose — server and client pages both import it,
 * matching `shared/bamboo-page-hero.tsx`. The only hook is the hairline
 * stroke's `useId`, which React also exports to server components.
 *
 * **`variant="hairline"`** (added for composite placements over photography):
 * the filled lip path is skipped, and instead the body path's own top-edge
 * curve is traced again as an open, unfilled stroke (`fill="none"`,
 * `vectorEffect="non-scaling-stroke"` so the line stays a constant visual
 * weight regardless of the viewBox's non-uniform scale). With no `lip`
 * passed, the line is a 4.5px METALLIC gold (client feedback 2026-09-24: "more
 * vibrant"): a width-spanning gradient over `--bam-gold-shade` /
 * `--bam-gold-vivid` / `--bam-gold-highlight` plus a 1px highlight core, see
 * `HairlineStroke` below. Those tokens are decorative-only (never for text),
 * which is fine because the line is decoration, not copy. A caller-supplied
 * `lip` still wins as a flat stroke color. The stroke is centered ON the
 * body's top edge, so its upper half necessarily
 * extends above that edge into the transparent area — that's intended, not a
 * misalignment: it's what makes the line read as sitting on top of the seam
 * rather than embedded in it.
 */
export function BambooWaveDivider({
  fill = "var(--bam-forest)",
  lip,
  fillOpacity = 1,
  lipOpacity = 1,
  flip = false,
  className,
  variant = "lip",
}: Props) {
  const resolvedLip = lip ?? "var(--bam-gold)";

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 1440 120"
      preserveAspectRatio="none"
      className={cn("block w-full", flip && "rotate-180", className)}
    >
      {variant === "lip" && (
        /* Gold lip, riding a shade above the body so the crest reads gold. */
        <path
          fill={resolvedLip}
          fillOpacity={lipOpacity}
          d="M0,44 C180,12 360,4 540,26 C760,54 900,96 1080,92 C1240,88 1340,60 1440,34 L1440,120 L0,120 Z"
        />
      )}
      {/* Body wave — the same curve dropped ~16 units, flowing into the band. */}
      <path
        fill={fill}
        fillOpacity={fillOpacity}
        d="M0,60 C180,28 360,20 540,42 C760,70 900,112 1080,108 C1240,104 1340,76 1440,50 L1440,120 L0,120 Z"
      />
      {variant === "hairline" && (
        <HairlineStroke stroke={lip} strokeOpacity={lipOpacity} />
      )}
    </svg>
  );
}

/** The body wave's top edge as an open curve (no floor closure). */
const BODY_EDGE =
  "M0,60 C180,28 360,20 540,42 C760,70 900,112 1080,108 C1240,104 1340,76 1440,50";

/**
 * The hairline variant's gold line. Split out so the `useId` it needs runs
 * only for `variant="hairline"` and the default `"lip"` markup stays
 * byte-identical. `useId` is server-safe (React exports it to the
 * react-server condition), so the divider stays usable from server pages.
 *
 * Unless the caller passes a `stroke`, the line is a metallic gold: a
 * `userSpaceOnUse` gradient across the full 1440-unit width (shade → vivid →
 * pale highlight → vivid → shade, with a second, softer sheen past the
 * trough) under a thin highlight core that reads as a specular glint. The
 * gradient id comes from `useId`, so two dividers on one page never share
 * (and never cross-wire) a gradient.
 */
function HairlineStroke({
  stroke,
  strokeOpacity,
}: {
  stroke?: string;
  strokeOpacity: number;
}) {
  const gradientId = `bam-wave-gold-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  if (stroke) {
    return (
      <path
        d={BODY_EDGE}
        fill="none"
        stroke={stroke}
        strokeOpacity={strokeOpacity}
        strokeWidth={4.5}
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
      />
    );
  }

  return (
    <>
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1={0}
          y1={0}
          x2={1440}
          y2={0}
        >
          <stop offset="0" stopColor="var(--bam-gold-shade)" />
          <stop offset="0.16" stopColor="var(--bam-gold-vivid)" />
          <stop offset="0.34" stopColor="var(--bam-gold-highlight)" />
          <stop offset="0.52" stopColor="var(--bam-gold-vivid)" />
          <stop offset="0.7" stopColor="var(--bam-gold-shade)" />
          <stop offset="0.86" stopColor="var(--bam-gold-vivid)" />
          <stop offset="1" stopColor="var(--bam-gold-shade)" />
        </linearGradient>
      </defs>
      <path
        d={BODY_EDGE}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeOpacity={strokeOpacity}
        strokeWidth={4.5}
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
      />
      {/* Specular core: a hairline of the pale highlight riding the centre of
          the band, so the line reads as polished metal, not flat paint. */}
      <path
        d={BODY_EDGE}
        fill="none"
        stroke="var(--bam-gold-highlight)"
        strokeOpacity={0.4 * strokeOpacity}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
      />
    </>
  );
}
