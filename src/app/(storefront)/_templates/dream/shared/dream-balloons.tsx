import type { CSSProperties } from "react";

type Balloon = {
  /** Which gutter the lane hugs; the CSS clamps it away from the center. */
  side: "left" | "right";
  /** Distance from that side's edge, % of the hero width (desktop). */
  inset: number;
  /** Rise duration, seconds. */
  dur: number;
  /** Negative start offset, seconds, so the layer is mid-flight at first paint. */
  delay: number;
  /** Sway in px — always OUTWARD (negative on left lanes, positive on right). */
  bx: number;
  /** Balloon-only color token, without the `--dream-` prefix. */
  color: string;
  /** Shown below 960px at the small size, with these gutter overrides. */
  mobile?: { inset: number; bx: number };
};

/**
 * 8 desktop balloons, 4 per side, durations 16–21s. Delays are
 * -dur * (i + .5) / 8 with sides interleaved (L, R, L, R…), so the phases
 * are spread evenly across a cycle and never bunch. Three entries carry a
 * `mobile` override and are the only ones visible below 960px.
 */
const BALLOONS: readonly Balloon[] = [
  { side: "left", inset: 3, dur: 18, delay: -1.1, bx: -34, color: "rose-soft", mobile: { inset: 2, bx: -14 } },
  { side: "right", inset: 9, dur: 20, delay: -3.8, bx: 40, color: "gold-soft" },
  { side: "left", inset: 13, dur: 17, delay: -5.3, bx: -24, color: "balloon-lilac" },
  { side: "right", inset: 3, dur: 21, delay: -9.2, bx: 22, color: "white" },
  { side: "left", inset: 7, dur: 16, delay: -9, bx: -44, color: "balloon-mint", mobile: { inset: 4, bx: -10 } },
  { side: "right", inset: 15, dur: 19, delay: -13.1, bx: 30, color: "balloon-peach", mobile: { inset: 3, bx: 12 } },
  { side: "left", inset: 16, dur: 18.5, delay: -15, bx: -28, color: "balloon-blush" },
  { side: "right", inset: 6, dur: 20.5, delay: -19.2, bx: 36, color: "balloon-periwinkle" },
];

/**
 * Hero-only ambient balloons (design.md "Balloons — the easter egg"; brief:
 * "low opacity, hero only"). Rewritten 2026-10-12 from three hard-coded
 * spans to the data table above: 8 pastel balloons (rose, gold, paper,
 * lilac, mint, peach, blush, periwinkle) rising over 16–21s so 4–5 are in
 * flight at once. The 2026-10-05 cut from five to three happened because
 * two lanes crossed the protected center, so lanes are now kept out by
 * construction rather than by eyeballed percentages: each balloon is
 * positioned from its own outer edge and clamped to `50% - 380px`
 * (the 640px copy column plus its veil), and sways outward only.
 * Below 960px the 3 `mobile` balloons stay on as small, fainter edge
 * hugs behind the copy; the rest are hidden. The paper balloon takes its
 * hairline from `data-tone="paper"`.
 * Pure CSS shapes, no sprites, so it costs nothing to render.
 * `DreamAmbientController` pauses the rise via `[data-paused]`; the
 * reduced-motion block hides the layer entirely (`display: none`) rather
 * than parking it, since a still balloon mid-rise reads as a mistake where
 * a still cloud reads as a calm sky.
 */
export function DreamBalloons() {
  return (
    <div className="dream-balloons" aria-hidden="true">
      {BALLOONS.map((b, i) => (
        <span
          key={i}
          className="dream-balloon"
          data-side={b.side}
          data-tone={b.color === "white" ? "paper" : undefined}
          data-mobile={b.mobile ? "" : undefined}
          style={
            {
              "--b-inset": `${b.inset}%`,
              "--b-inset-m": b.mobile ? `${b.mobile.inset}%` : undefined,
              "--b-dur": `${b.dur}s`,
              "--b-delay": `${b.delay}s`,
              "--bx": `${b.bx}px`,
              "--bx-m": b.mobile ? `${b.mobile.bx}px` : undefined,
              "--b-color": `var(--dream-${b.color})`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
