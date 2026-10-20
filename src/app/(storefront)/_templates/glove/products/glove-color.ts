/**
 * Swatch + option-name helpers for the glove product page.
 *
 * Name lookup is shared with olive via `~/lib/products/color-swatches`. The
 * hex values there are PRODUCT colours (the leather a glove is cut from), not
 * brand surfaces: they are the only colour literals the glove template draws
 * with, and they live in `.ts` modules so no `.tsx` component carries one.
 * Everything the template paints for itself rides a `--glove-*` token. An
 * unrecognised colour name never gets an invented swatch: it resolves to
 * `unknown` and the chip draws a labelled paper disc instead.
 */

import {
  BASE_PRODUCT_COLORS,
  matchColorName,
} from "~/lib/products/color-swatches";

/**
 * Every built-in name now lives in the shared `BASE_PRODUCT_COLORS`; glove adds
 * nothing of its own. Owners can also pin a hex per color on the product.
 */
const GLOVE_COLOR_NAMES: Record<string, string> = {
  ...BASE_PRODUCT_COLORS,
};

/** Colour NAME → swatch, or null. Whole string, then the longest known run of words. */
function colorFromName(value: string): string | null {
  return matchColorName(GLOVE_COLOR_NAMES, value);
}

function isCssColorValue(value: string): boolean {
  return /^(#|rgb\(|rgba\(|hsl\(|hsla\(|oklch\(|var\()/i.test(value.trim());
}

export type GloveSwatch = { color: string; unknown: boolean };

/** Any owner-supplied colour value (hex, rgb(), or an English name) → paint. */
export function resolveSwatch(value: string): GloveSwatch {
  const trimmed = value.trim();
  if (!trimmed) return { color: "var(--glove-paper)", unknown: true };
  if (isCssColorValue(trimmed)) return { color: trimmed, unknown: false };
  const named = colorFromName(trimmed);
  if (named) return { color: named, unknown: false };
  return { color: "var(--glove-paper)", unknown: true };
}

/** "Color", "Colors", "Colour", "Shade"… → drawn as swatches. */
export function isColorOptionName(key: string): boolean {
  return /^(colou?rs?|colou?rway|shades?|finish)$/i.test(key.trim());
}

/** "Size", "Sizes", "Glove size" → drawn as square buttons. */
export function isSizeOptionName(key: string): boolean {
  return /(^|\s)sizes?$/i.test(key.trim());
}

/**
 * Easy Guide step number for an option dimension (design.md: 2 Color ·
 * 3 Size · 4 Grommet · 5 Chain · 6 Charms; step 1, Style, is the product
 * itself). Null when the name matches no step, so the row renders unnumbered.
 */
export function gloveStepForOption(key: string): number | null {
  if (isColorOptionName(key)) return 2;
  if (isSizeOptionName(key)) return 3;
  if (/grommet|o-?ring/i.test(key)) return 4;
  if (/chain/i.test(key)) return 5;
  if (/charm/i.test(key)) return 6;
  return null;
}

/** `{ Size: "M", Colors: "Navy" }` from a variant's JSON, junk dropped. */
export function variantOptionsOf(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string" && value.trim().length > 0) {
      out[key] = value.trim();
    }
  }
  return out;
}

export type GloveOptionGroup = { key: string; values: string[] };

/** Option dimensions in first-seen order, each with its distinct values. */
export function variantOptionGroups(
  variants: { options: unknown }[],
): GloveOptionGroup[] {
  const found = new Map<string, string[]>();
  for (const variant of variants) {
    for (const [key, value] of Object.entries(
      variantOptionsOf(variant.options),
    )) {
      const values = found.get(key) ?? [];
      if (!values.includes(value)) values.push(value);
      found.set(key, values);
    }
  }
  return Array.from(found, ([key, values]) => ({
    key,
    values: isSizeOptionName(key) ? sortSizes(values) : values,
  }));
}

/** Clothing sizes, smallest first (owners enter variants in any order). */
const SIZE_ORDER = [
  "xxs",
  "xs",
  "s",
  "m",
  "l",
  "xl",
  "xxl",
  "xxxl",
  "4xl",
  "5xl",
];

function sizeRank(value: string): number {
  const v = value.trim().toLowerCase().replace(/\s+/g, "");
  const named: Record<string, string> = {
    small: "s",
    medium: "m",
    large: "l",
    "x-large": "xl",
    xlarge: "xl",
    extralarge: "xl",
    "x-small": "xs",
    xsmall: "xs",
  };
  const key = named[v] ?? v;
  // 1XL sits with XL, 2XL with XXL.
  const normalized =
    key === "1xl" ? "xl" : key === "2xl" ? "xxl" : key === "3xl" ? "xxxl" : key;
  const i = SIZE_ORDER.indexOf(normalized);
  if (i !== -1) return i;
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? 100 + n : 1000;
}

/** Stable sort: known sizes by rank, numeric sizes ascending, the rest as entered. */
export function sortSizes(values: string[]): string[] {
  return values
    .map((value, index) => ({ value, index, rank: sizeRank(value) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.value);
}

/** Display form of an option name: owners often save "color" / "size". */
export function optionDisplayName(key: string): string {
  const trimmed = key.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}
