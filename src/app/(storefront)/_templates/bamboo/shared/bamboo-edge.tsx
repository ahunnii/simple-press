import type { BambooGlyphId } from "./bamboo-glyph";
import { cn } from "~/lib/utils";

import { BambooGlyph } from "./bamboo-glyph";

/**
 * Torn-leaf section divider. Ported from the mockup's `.edge` blocks
 * (`docs/templates/bamboo/build/mockup-refs/mockup-b.elided.html`, e.g. lines
 * ~821-834): a 3-layer SVG —
 *   1. a full-bleed rect in the OUTGOING color (the seam fix — never omit,
 *      it's what makes the two flat-color bands read as one continuous sheet
 *      of torn paper rather than a hairline gap),
 *   2. a wave path in `--bamboo-sage-deep` (the mid-ply "shadow" between the
 *      two sheets — the mockup always uses this color here, regardless of
 *      the from/to combination),
 *   3. the SAME wave path translated down 11-12px, filled in the INCOMING
 *      color.
 *
 * The mockup uses 3 distinct wave paths across its 5 edge instances — ported
 * verbatim below as `variant="a" | "b" | "c"`.
 */

type BambooEdgeToken =
  | "sage"
  | "sage-deep"
  | "paper"
  | "pine"
  | "roll"
  | "cream";

const TOKEN_VAR: Record<BambooEdgeToken, string> = {
  sage: "var(--bamboo-sage)",
  "sage-deep": "var(--bamboo-sage-deep)",
  paper: "var(--bamboo-paper)",
  pine: "var(--bamboo-pine)",
  roll: "var(--bamboo-roll)",
  cream: "var(--bamboo-cream)",
};

type WaveVariant = "a" | "b" | "c";

const WAVE_PATHS: Record<WaveVariant, { d: string; offset: number }> = {
  // used once, directly after the hero (sage -> paper; mockup line ~824)
  a: {
    d: "M0,46 Q60,10 130,30 Q200,52 268,26 Q340,4 402,34 Q470,58 540,30 Q604,6 672,28 Q742,50 812,24 Q880,2 944,32 Q1012,56 1080,28 Q1148,4 1216,30 Q1286,54 1352,26 Q1404,10 1440,34 L1440,78 L0,78 Z",
    offset: 11,
  },
  // used for the two paper<->sage transitions mid-page (mockup lines ~909, ~1138)
  b: {
    d: "M0,34 Q54,6 122,28 Q196,54 262,24 Q332,2 398,32 Q468,58 536,28 Q606,4 674,30 Q744,54 812,26 Q882,2 948,30 Q1016,54 1084,26 Q1152,2 1220,32 Q1290,56 1356,28 Q1408,8 1440,30 L1440,78 L0,78 Z",
    offset: 12,
  },
  // used after the why-bamboo band (sage -> paper), and again just before the
  // footer (sage -> pine) (mockup lines ~1020, ~1210)
  c: {
    d: "M0,30 Q66,4 134,28 Q206,54 272,26 Q344,2 410,30 Q478,56 546,28 Q614,4 682,30 Q752,56 820,28 Q890,2 956,30 Q1024,54 1092,26 Q1160,2 1228,30 Q1298,56 1364,28 Q1412,10 1440,28 L1440,78 L0,78 Z",
    offset: 11,
  },
};

type LeafGlyphId = Extract<BambooGlyphId, "s-leaf" | "s-leaf-d" | "s-leaf-l">;

export type BambooEdgeLeaf = {
  id: LeafGlyphId;
  /** All positional values are raw CSS lengths, e.g. "14%", "28px", "-24deg". */
  l: string;
  t?: string;
  w?: string;
  r?: string;
};

type BambooEdgeProps = {
  from: BambooEdgeToken;
  to: BambooEdgeToken;
  variant?: WaveVariant;
  leaves?: BambooEdgeLeaf[];
  className?: string;
};

export function BambooEdge({
  from,
  to,
  variant = "a",
  leaves,
  className,
}: BambooEdgeProps) {
  const wave = WAVE_PATHS[variant];

  return (
    <div className={cn("bamboo-edge", className)} aria-hidden="true">
      <svg viewBox="0 0 1440 78" preserveAspectRatio="none">
        <rect width="1440" height="78" fill={TOKEN_VAR[from]} />
        <path d={wave.d} fill="var(--bamboo-sage-deep)" />
        <g transform={`translate(0,${wave.offset})`}>
          <path d={wave.d} fill={TOKEN_VAR[to]} />
        </g>
      </svg>
      {leaves && leaves.length > 0 ? (
        <div className="bamboo-edge-leaves">
          {leaves.map((leaf, i) => (
            <span
              key={`${leaf.id}-${i}`}
              style={
                {
                  "--l": leaf.l,
                  "--t": leaf.t,
                  "--w": leaf.w,
                  "--r": leaf.r,
                } as React.CSSProperties
              }
            >
              <BambooGlyph id={leaf.id} />
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
