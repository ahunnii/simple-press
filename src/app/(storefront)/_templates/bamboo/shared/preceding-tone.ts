/**
 * Shared pure helper for computing which background tone actually precedes
 * a wave seam once hideable sections are toggled off by the owner (or, for
 * Featured, auto-hidden when the store has no products — see
 * `homepage/bamboo-featured-section.tsx`).
 *
 * Every wave placement in the template (docs/templates/bamboo/design.md
 * "Gold wave -> green value band, now a system") assumes a specific section
 * renders immediately above it and backs the wave's transparent-above area
 * with that section's own color. Hiding a section can promote a
 * different-toned section into that spot, so callers walk their own running
 * order, nearest-first, and hand this function each candidate's visibility
 * + the tone it paints when visible. The first visible candidate wins; if
 * none are visible, `fallback` is the tone of whatever always renders above
 * all of them (e.g. the hero, which always ends on flat cream).
 */
export type SectionTone = "cream" | "cream-deep" | "forest";

export type PrecedingToneCandidate = {
  /** Whether this section actually renders (visibility flag, and for
   * data-conditional sections like Featured, also has content). */
  visible: boolean;
  /** The background tone this section paints when it renders. */
  tone: SectionTone;
};

/**
 * Walks `candidates` nearest-first (the section immediately above the seam
 * first) and returns the tone of the first visible one, or `fallback` when
 * none are visible.
 */
export function computePrecedingTone(
  candidates: PrecedingToneCandidate[],
  fallback: SectionTone,
): SectionTone {
  for (const candidate of candidates) {
    if (candidate.visible) return candidate.tone;
  }
  return fallback;
}
