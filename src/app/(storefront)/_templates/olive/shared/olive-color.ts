/**
 * Swatch resolution for olive colour chips.
 *
 * The chip discipline (docs/templates/olive/design.md) says a chip only ever
 * carries a real colour, a category or a stock state — so the swatch has to
 * come from the owner's own variant data, never from the template. Owners
 * type colour *names* ("Sage", "Deep Navy", "Ivory") far more often than they
 * type hex, so this module is the one place that turns a name into a paint.
 *
 * The hex values here and in the shared `~/lib/products/color-swatches` list
 * are the ONLY colour literals allowed in the olive template: they are product
 * colours, not brand surfaces. Everything the template draws for itself rides
 * a `--olive-*` token. An unrecognised name deliberately does NOT get an
 * invented colour — it resolves to the paper ground and is drawn hatched, with
 * the owner's own label in the tooltip, so the page tells the truth about what
 * it does not know.
 */

import {
  BASE_PRODUCT_COLORS,
  matchColorName,
} from "~/lib/products/color-swatches";

/**
 * Built-in names come from the shared `BASE_PRODUCT_COLORS`; these are the
 * olive-only extras (the base list has no slate, terracotta or rust).
 */
const OLIVE_COLOR_NAMES: Record<string, string> = {
  ...BASE_PRODUCT_COLORS,
  slate: "#7e99a3",
  terracotta: "#c4623f",
  rust: "#a6522c",
};

/**
 * Resolve a colour NAME to a swatch, or `null` when the name is not one this
 * module knows. Tries the whole string first ("navy"), then the longest run of
 * known words ("Hunter Green" stays hunter green, "Sage Leaf" → sage, "Deep
 * Navy" → navy). Names that resolve nowhere stay unknown on purpose.
 */
export function colorFromName(value: string): string | null {
  return matchColorName(OLIVE_COLOR_NAMES, value);
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
  if (!trimmed) return { color: "var(--olive-sand)", unknown: true };
  if (isCssColorValue(trimmed)) return { color: trimmed, unknown: false };

  const named = colorFromName(trimmed);
  if (named) return { color: named, unknown: false };

  return { color: "var(--olive-sand)", unknown: true };
}

/**
 * True when a variant option key names a colour dimension — the only
 * dimension the template ever draws as chips. Matches the spellings owners
 * actually use in the admin variant manager.
 */
export function isColorOptionName(key: string): boolean {
  return /^(colou?rs?|colou?rway|shades?|finish)$/i.test(key.trim());
}

/**
 * The four chip colours the collection lists rotate through. Chips here are a
 * category tab, which the chip discipline allows — they are never decoration
 * and never sit above a heading.
 */
const CHIP_TOKENS = [
  "--olive-moss",
  "--olive-stone",
  "--olive-moss-deep",
  "--olive-sand",
] as const;

export function oliveChipToken(index: number): string {
  const token = CHIP_TOKENS[index % CHIP_TOKENS.length] ?? CHIP_TOKENS[0];
  return `var(${token})`;
}
