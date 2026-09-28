import type { CSSProperties } from "react";

/**
 * vii's one page edge (baseline B1.7).
 *
 * Every vii hero — `ViiHero` (cover images), the cream title bands on the
 * generic / shop / collections / services pages — puts its text on the
 * section gutter `clamp(24px, 6vw, 96px)` (= `--vii-section-pad-x`): 86px at
 * 1440, 24px at 390. Heroes are left-anchored, never centered in a capped
 * container, so a section below one only shares that edge when its content
 * is left-anchored on the same gutter too. A centered `maxWidth: 1100,
 * margin: "0 auto"` box inside the gutter drifts right at wide viewports
 * (170px at 1440), which is the width-rhythm break this module exists to
 * stop.
 *
 * Centered editorial bands (an intro in a centered 760px column, a centered
 * closing banner) are deliberate and stay centered — these helpers are for
 * the non-centered sections only.
 */

/** Horizontal page gutter: the hero text edge. Use as padding-inline. */
export const VII_PAGE_GUTTER = "var(--vii-section-pad-x)";

/**
 * Widest content box. At 1440 the gutter leaves 1267px, so the box fills it
 * (86 left, 86 right); wider screens keep it on the hero's left edge rather
 * than re-centering it.
 */
export const VII_EDGE_MAX_WIDTH = 1280;

/** Readable measure for running text on the page edge (≈ 65–75ch at 15–17px). */
export const VII_TEXT_MEASURE = 720;

/**
 * Style for a non-centered section's inner container: left-anchored on the
 * gutter, capped at {@link VII_EDGE_MAX_WIDTH}. Replaces
 * `{ maxWidth: 1100, margin: "0 auto" }`.
 */
export const VII_EDGE_CONTAINER: CSSProperties = {
  maxWidth: VII_EDGE_MAX_WIDTH,
  marginLeft: 0,
  marginRight: "auto",
};

/**
 * Top padding for a cream title band under vii's fixed header. The header
 * is `position: fixed` (≈89px tall at 1440 and 390, plus the announcement
 * bar when one is set), so a band that starts at y=0 must clear it:
 * `--vii-header-offset` (106px) + 48–72px of air puts the first overline at
 * ≈178px on desktop and ≈154px on phones.
 */
export const VII_BAND_PADDING_TOP =
  "calc(var(--vii-header-offset) + clamp(48px, 6vw, 72px))";
