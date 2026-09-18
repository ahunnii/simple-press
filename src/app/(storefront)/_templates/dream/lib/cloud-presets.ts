/**
 * Typed sprite presets for `<DreamClouds variant>` (design.md "Motion ›
 * Cloud system"). Sprites are baked WebP puffs at
 * `/templates/dream/clouds/` — produced by `scripts/generate-dream-clouds.ts`
 * from `scripts/dream-clouds/clouds.html` (white-wisp recipe, revised
 * 2026-09-17 — pure-white overlapping ellipses, no blue-grey/grey tones;
 * blur baked into the `-soft` variants, zero runtime `filter`). They are
 * generated in a parallel workstream; only the paths are referenced here.
 *
 * - `cloud-1.webp` … `cloud-5.webp` — 1600×640 (aspect 2.5), sharp, near
 *   layers.
 * - `cloud-1-soft.webp` … `cloud-5-soft.webp` — 1200×480 (aspect 2.5),
 *   pre-blurred, far layers.
 * - `wisp-1.webp`, `wisp-2.webp` — 1600×260 (aspect ~6.15), thin trailing
 *   wisps for the hero floor and the horizon band.
 *
 * Runtime is transform-only: `<DreamClouds>` renders each entry as an
 * `<img class="dream-cloud">` with these values written to CSS custom
 * properties (`--w`, `--top`, `--op`, `--dur`, `--delay`, `--rest`) that the
 * `.dream .dream-cloud` / `@keyframes dream-drift` rules in globals.css
 * read — see `shared/dream-clouds.tsx`.
 */

const SPRITE_BASE = "/templates/dream/clouds";

export type DreamCloudVariant = "hero" | "page" | "horizon";

export type DreamCloudSprite = {
  /** Sprite filename under `/templates/dream/clouds/` (no path prefix). */
  sprite: string;
  /** Rendered width in px — written to `--w`. */
  w: number;
  /** Vertical position (`%` or px string) — written to `--top`. */
  top: string;
  /** Steady-state opacity — written to `--op`. */
  op: number;
  /** Drift duration in seconds — written to `--dur`. */
  dur: number;
  /**
   * Negative animation-delay in seconds so the sky is already populated at
   * first paint (never all clouds starting from the left edge at once).
   */
  delay: number;
  /**
   * Parked translateX in px used by the reduced-motion rule
   * (`.dream .dream-cloud { transform: translate3d(var(--rest), 0, 0) }`) —
   * written to `--rest`.
   */
  rest: number;
  /** Drift right-to-left instead of the default left-to-right. */
  reverse?: boolean;
  /** Use the pre-blurred `-soft` sprite variant (far/background layers). */
  soft?: boolean;
};

function sprite(name: string, soft?: boolean): string {
  const file = soft ? `${name}-soft.webp` : `${name}.webp`;
  return `${SPRITE_BASE}/${file}`;
}

/**
 * `hero`: the four reference clouds sized like the reference `index.html`
 * board (≈540 / 620 / 760 / 960px at opacities .95 / .85 / .75 / .65, the
 * two largest riding the pre-blurred `-soft` sprites) + the original floor
 * wisp, UNCHANGED, plus three mid/far fillers and a second floor wisp
 * (design.md → Motion / Cloud system, "Hero preset (revised 2026-09-17, a
 * few more clouds)": 7 clouds + 2 wisps total). The two reference near
 * clouds stay first in the array so `DreamClouds`' default `eager={2}`
 * keeps loading exactly them. Vertical positions now spread 8–88% down the
 * hero; durations 26–48s (near→far). `rest` values (the parked position
 * under reduced motion) keep every cloud's [rest, rest+w] span clear of
 * the protected center 640px column at 1440px wide (x ∈ [400, 1040]).
 * Negative delays are chosen so at first paint 4 clouds are solidly in
 * frame (the two reference clouds + the floor wisp + the far soft filler)
 * and one filler is just crossing in from each edge — never all nine
 * clouds visible at once, never an empty sky.
 */
const hero: DreamCloudSprite[] = [
  // 540px, near/sharp, opacity .95 — parked left of the protected column.
  {
    sprite: sprite("cloud-1"),
    w: 540,
    top: "8%",
    op: 0.95,
    dur: 26,
    delay: -10,
    rest: -460,
  },
  // 620px, sharp, opacity .85 — parked right of the protected column.
  {
    sprite: sprite("cloud-3"),
    w: 620,
    top: "25%",
    op: 0.85,
    dur: 32,
    delay: -24,
    rest: 1080,
    reverse: true,
  },
  // 760px, soft, opacity .75 — parked left, clear at this width.
  {
    sprite: sprite("cloud-5", true),
    w: 760,
    top: "51%",
    op: 0.75,
    dur: 38,
    delay: -35,
    rest: -560,
    soft: true,
  },
  // 960px, soft, opacity .65 — the largest/farthest, parked right.
  {
    sprite: sprite("cloud-2", true),
    w: 960,
    top: "75%",
    op: 0.65,
    dur: 44,
    delay: -50,
    rest: 1120,
    soft: true,
    reverse: true,
  },
  // Wisp near the hero floor.
  {
    sprite: sprite("wisp-1"),
    w: 620,
    top: "84%",
    op: 0.6,
    dur: 52,
    delay: -30,
    rest: -300,
  },
  // Filler: 420px soft, opacity .55 — just entering from the left at t=0
  // (x ≈ -286px, 134px of it already onscreen).
  {
    sprite: sprite("cloud-4", true),
    w: 420,
    top: "14%",
    op: 0.55,
    dur: 34,
    delay: -2,
    rest: -500,
    soft: true,
  },
  // Filler: 480px sharp, opacity .7, reversed — just entering from the
  // right at t=0 (x ≈ 1360px, 80px of it already onscreen).
  {
    sprite: sprite("cloud-2"),
    w: 480,
    top: "62%",
    op: 0.7,
    dur: 30,
    delay: -7,
    rest: 1150,
    reverse: true,
  },
  // Filler: 680px soft, opacity .5 — solidly in frame at t=0 (x ≈ 603px,
  // fully within the 1440-wide viewport).
  {
    sprite: sprite("cloud-1", true),
    w: 680,
    top: "40%",
    op: 0.5,
    dur: 48,
    delay: -22,
    rest: -700,
    soft: true,
  },
  // Second floor wisp, reversed — off-screen right at t=0, drifts in later.
  {
    sprite: sprite("wisp-2"),
    w: 560,
    top: "88%",
    op: 0.45,
    dur: 58,
    delay: -5,
    rest: 1180,
    reverse: true,
  },
];

/**
 * `page`: 5 clouds (was 3), slower and quieter — a still sky behind
 * `DreamPageHero`, not the hero's living moment. Opacities bumped +.1
 * again this round (cap .7) and durations dropped to 45/52/60s so the
 * cool-tinted sprites still read and drift is noticeable without matching
 * the hero's livelier pace. Two more fillers added per design.md ("a few
 * more clouds"): a far soft one and a near sharp reversed one, tops spread
 * 6–40% across all five.
 */
const page: DreamCloudSprite[] = [
  {
    sprite: sprite("cloud-2", true),
    w: 420,
    top: "8%",
    op: 0.6,
    dur: 45,
    delay: -15,
    rest: -200,
    soft: true,
  },
  {
    sprite: sprite("cloud-4"),
    w: 320,
    top: "22%",
    op: 0.7,
    dur: 52,
    delay: -45,
    rest: 260,
    reverse: true,
  },
  {
    sprite: sprite("cloud-1", true),
    w: 380,
    top: "32%",
    op: 0.55,
    dur: 60,
    delay: -70,
    rest: 140,
    soft: true,
  },
  // Filler: 360px soft, opacity .45 — highest in the band.
  {
    sprite: sprite("cloud-3", true),
    w: 360,
    top: "6%",
    op: 0.45,
    dur: 48,
    delay: -18,
    rest: -180,
    soft: true,
  },
  // Filler: 300px sharp, opacity .6, reversed — lowest in the band.
  {
    sprite: sprite("cloud-5"),
    w: 300,
    top: "40%",
    op: 0.6,
    dur: 58,
    delay: -40,
    rest: 1200,
    reverse: true,
  },
];

/**
 * `horizon`: 3 wisps (was 2) anchored at the top edge of a band (e.g.
 * `DreamQuoteCta`), masked by the band's static container so they never
 * spill past its edge. Opacities bumped +.1 from the shaded-sphere recipe
 * so the white/cool-tinted wisps still read against the band ground;
 * durations dropped to 55/72s this round to match the faster drift speed.
 * Third wisp added per design.md ("a few more clouds"): a thinner, fainter
 * reversed one near the very top.
 */
const horizon: DreamCloudSprite[] = [
  {
    sprite: sprite("wisp-1"),
    w: 560,
    top: "-6%",
    op: 0.55,
    dur: 55,
    delay: -20,
    rest: -260,
  },
  {
    sprite: sprite("wisp-2"),
    w: 480,
    top: "2%",
    op: 0.45,
    dur: 72,
    delay: -60,
    rest: 200,
    reverse: true,
  },
  {
    sprite: sprite("wisp-1"),
    w: 520,
    top: "-2%",
    op: 0.4,
    dur: 66,
    delay: -38,
    rest: 380,
    reverse: true,
  },
];

export const DREAM_CLOUD_PRESETS: Record<
  DreamCloudVariant,
  DreamCloudSprite[]
> = {
  hero,
  page,
  horizon,
};
