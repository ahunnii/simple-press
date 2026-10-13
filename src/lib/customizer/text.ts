/**
 * Text-option cleaning (engravings and the like).
 *
 * The same function runs on the storefront input, in `normalizeSelection`
 * (cart identity) and in the evaluator (what gets stored and printed), so a
 * line's key, its live total and its snapshot agree on the exact text.
 *
 * Keeps all normal Unicode — accents, CJK, emoji including ZWJ sequences.
 * Removes only what has no business on an engraving or a packing slip:
 * C0/C1 control characters (tabs and newlines become a space), bidi
 * override/isolate marks (they visually reorder text in the admin and
 * emails), and lone surrogates (invalid UTF-16 that breaks JSON round-trips).
 * Then trims. Nothing else is collapsed or rewritten.
 */

const WHITESPACE_CONTROLS = /[\t\n\r\v\f\u0085\u2028\u2029]/g;
const OTHER_CONTROLS = /[\u0000-\u001f\u007f-\u009f]/g;
const BIDI_CONTROLS = /[\u202a-\u202e\u2066-\u2069]/g;
const LONE_SURROGATES =
  /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g;

export function cleanCustomizerText(raw: string): string {
  return raw
    .replace(LONE_SURROGATES, "")
    .replace(WHITESPACE_CONTROLS, " ")
    .replace(OTHER_CONTROLS, "")
    .replace(BIDI_CONTROLS, "")
    .trim();
}

/**
 * Length in code points, so an emoji counts once rather than twice. (A
 * browser `maxLength` counts UTF-16 units, which is stricter — an input
 * capped that way never exceeds this count.)
 */
export function customizerTextLength(text: string): number {
  return Array.from(text).length;
}

/** Truncate to `max` code points, ending with "…" when cut. */
export function truncateCodePoints(text: string, max: number): string {
  const chars = Array.from(text);
  if (chars.length <= max) return text;
  return (
    chars
      .slice(0, Math.max(0, max - 1))
      .join("")
      .trimEnd() + "…"
  );
}
