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
};

/**
 * BambooWaveDivider — the template's canonical gold-lip → forest wave, bamboo's
 * third signature moment (docs/templates/bamboo/design.md "Signature moments").
 * This geometry is the single source of truth: the homepage value band, the
 * about page's Detroit banner lip, and the footer all ride these two curves.
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
 * Hook-free and free of `"use client"` on purpose — server and client pages
 * both import it, matching `shared/bamboo-page-hero.tsx`.
 */
export function BambooWaveDivider({
  fill = "var(--bam-forest)",
  lip = "var(--bam-gold)",
  fillOpacity = 1,
  lipOpacity = 1,
  flip = false,
  className,
}: Props) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 1440 120"
      preserveAspectRatio="none"
      className={cn("block w-full", flip && "rotate-180", className)}
    >
      {/* Gold lip, riding a shade above the body so the crest reads gold. */}
      <path
        fill={lip}
        fillOpacity={lipOpacity}
        d="M0,44 C180,12 360,4 540,26 C760,54 900,96 1080,92 C1240,88 1340,60 1440,34 L1440,120 L0,120 Z"
      />
      {/* Body wave — the same curve dropped ~16 units, flowing into the band. */}
      <path
        fill={fill}
        fillOpacity={fillOpacity}
        d="M0,60 C180,28 360,20 540,42 C760,70 900,112 1080,108 C1240,104 1340,76 1440,50 L1440,120 L0,120 Z"
      />
    </svg>
  );
}
