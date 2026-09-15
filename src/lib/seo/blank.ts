/**
 * Blank-aware coalescing for owner-editable text.
 *
 * `??` is the wrong operator for these fields: a value the owner has cleared
 * comes back as `""`, not `null`, and a blank must fall through to the next
 * candidate rather than win. The coalescing ternary that says this correctly
 * trips the repo's `prefer-nullish-coalescing` rule — hence named helpers.
 * Same shape and reasoning as `resolveLogoAlt` in `~/lib/logo-alt`.
 *
 * Pure and dependency-free so it is safe in both server components
 * (`~/lib/seo`) and admin client forms.
 */

/** First meaningful (non-blank) candidate, trimmed, or `undefined`. */
export function firstNonBlank(
  ...candidates: (string | null | undefined)[]
): string | undefined {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed !== undefined && trimmed.length > 0) return trimmed;
  }
  return undefined;
}

/** As `firstNonBlank`, but with a guaranteed fallback, so it returns a string. */
export function preferNonBlank(
  value: string | null | undefined,
  fallback: string,
): string {
  const trimmed = value?.trim();
  if (trimmed === undefined || trimmed.length === 0) return fallback;
  return trimmed;
}
