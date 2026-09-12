/**
 * Swatch resolution for olive colour chips.
 *
 * The chip discipline (docs/templates/olive/design.md) says a chip only ever
 * carries a real colour, a category or a stock state — so the swatch has to
 * come from the owner's own variant data, never from the template. Owners
 * type colour *names* ("Sage", "Deep Navy", "Ivory") far more often than they
 * type hex, so this module is the one place that turns a name into a paint.
 *
 * The hex values below are the ONLY literals allowed in the olive template:
 * they are product colours, not brand surfaces. Everything the template draws
 * for itself rides a `--olive-*` token. An unrecognised name deliberately does
 * NOT get an invented colour — it resolves to the paper ground and is drawn
 * hatched, with the owner's own label in the tooltip, so the page tells the
 * truth about what it does not know.
 */

/** A named garment/product colour → the swatch drawn in the chip. */
const OLIVE_COLOR_NAMES: Record<string, string> = {
  sage: "#9caf9c",
  olive: "#6b7043",
  slate: "#7e99a3",
  black: "#1a1a1a",
  white: "#ffffff",
  ivory: "#f4f0e6",
  cream: "#f2e8d5",
  navy: "#1f2a44",
  brown: "#6b4a32",
  tan: "#d2a679",
  camel: "#c19a6b",
  chocolate: "#4a2c1d",
  blush: "#e8c4c0",
  pink: "#e8a0b4",
  red: "#b02a2a",
  burgundy: "#6e1f2e",
  wine: "#5a1b2b",
  green: "#3e7a4e",
  forest: "#23422f",
  blue: "#2f5d8c",
  denim: "#4a6d96",
  grey: "#8e918f",
  gray: "#8e918f",
  charcoal: "#36393b",
  gold: "#c7a44a",
  silver: "#c4c7c9",
  beige: "#e3d9c6",
  taupe: "#a79c8e",
  terracotta: "#c4623f",
  rust: "#a6522c",
  lavender: "#c3b5de",
  lilac: "#c8a2c8",
  yellow: "#e3c04c",
  mustard: "#c9971f",
  orange: "#d2703a",
  coral: "#e1735d",
  teal: "#2e7d80",
};

/** Lowercase, collapse punctuation and runs of whitespace. */
function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[_/\\]+/g, " ")
    .replace(/[^a-z\s-]/g, "")
    .replace(/[-\s]+/g, " ")
    .trim();
}

/**
 * Resolve a colour NAME to a swatch, or `null` when the name is not one this
 * module knows. Tries the whole string first ("navy"), then the first word
 * ("Navy Blue" → navy, "Sage Green" → sage), then the last ("Deep Navy" →
 * navy). Multi-word names that resolve nowhere stay unknown on purpose.
 */
export function colorFromName(value: string): string | null {
  const normalized = normalizeName(value);
  if (!normalized) return null;

  const exact = OLIVE_COLOR_NAMES[normalized];
  if (exact) return exact;

  const words = normalized.split(" ").filter(Boolean);
  if (words.length < 2) return null;

  const first = words[0] ? OLIVE_COLOR_NAMES[words[0]] : undefined;
  if (first) return first;

  const last = words[words.length - 1];
  return (last ? OLIVE_COLOR_NAMES[last] : undefined) ?? null;
}

/** True when the string is already a CSS colour the browser can paint. */
function isCssColorValue(value: string): boolean {
  return /^(#|rgb\(|rgba\(|hsl\(|hsla\(|oklch\(|lab\(|lch\(|color\(|var\()/i.test(
    value.trim(),
  );
}

export type OliveResolvedChipColor = {
  /** What to paint the chip with. Always a usable CSS colour. */
  color: string;
  /**
   * True when neither a CSS colour nor a known name was supplied. The chip
   * renders hatched over the paper ground and leans on its label instead of
   * inventing a swatch.
   */
  unknown: boolean;
};

/**
 * Turn any owner-supplied colour value — hex, `rgb()`, a `--olive-*` var, or a
 * plain English name — into something a chip can paint.
 */
export function resolveChipColor(value: string): OliveResolvedChipColor {
  const trimmed = value.trim();
  if (!trimmed) return { color: "var(--olive-paper)", unknown: true };
  if (isCssColorValue(trimmed)) return { color: trimmed, unknown: false };

  const named = colorFromName(trimmed);
  if (named) return { color: named, unknown: false };

  return { color: "var(--olive-paper)", unknown: true };
}

/**
 * True when a variant option key names a colour dimension — the only
 * dimension the template ever draws as chips. Matches the spellings owners
 * actually use in the admin variant manager.
 */
export function isColorOptionName(key: string): boolean {
  return /^(colou?r|colou?rway|shade|finish)$/i.test(key.trim());
}

/**
 * The four chip colours the collection lists rotate through. Chips here are a
 * category tab, which the chip discipline allows — they are never decoration
 * and never sit above a heading.
 */
const CHIP_TOKENS = [
  "--olive-sage-bright",
  "--olive-slate",
  "--olive-leaf",
  "--olive-paper",
] as const;

export function oliveChipToken(index: number): string {
  const token = CHIP_TOKENS[index % CHIP_TOKENS.length] ?? CHIP_TOKENS[0];
  return `var(${token})`;
}
