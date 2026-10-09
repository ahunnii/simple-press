/**
 * Swatch + option-name helpers for the glove product page.
 *
 * Logic ported from olive's `shared/olive-color.ts` (kept local so the two
 * templates never couple). The hex values below are PRODUCT colours (the
 * leather a glove is cut from), not brand surfaces: they are the only colour
 * literals in the glove template, and they live in a `.ts` module so no
 * `.tsx` component carries one. Everything the template paints for itself
 * rides a `--glove-*` token. An unrecognised colour name never gets an
 * invented swatch: it resolves to `unknown` and the chip draws a labelled
 * paper disc instead.
 */

const GLOVE_COLOR_NAMES: Record<string, string> = {
  black: "#1a1a1a",
  white: "#ffffff",
  ivory: "#f4f0e6",
  cream: "#f2e8d5",
  navy: "#1f2a44",
  brown: "#6b4a32",
  tan: "#d2a679",
  camel: "#c19a6b",
  cognac: "#9a4a1f",
  chocolate: "#4a2c1d",
  blush: "#e8c4c0",
  pink: "#e8a0b4",
  fuchsia: "#c2185b",
  fushia: "#c2185b",
  fuschia: "#c2185b",
  magenta: "#b0237a",
  red: "#b02a2a",
  burgundy: "#6e1f2e",
  wine: "#5a1b2b",
  maroon: "#5c1a1f",
  purple: "#601b76",
  plum: "#5b2a4e",
  lavender: "#c3b5de",
  lilac: "#c8a2c8",
  green: "#3e7a4e",
  emerald: "#1f7a52",
  olive: "#6b7043",
  forest: "#23422f",
  blue: "#2f5d8c",
  royal: "#2a4bab",
  denim: "#4a6d96",
  teal: "#2e7d80",
  grey: "#8e918f",
  gray: "#8e918f",
  charcoal: "#36393b",
  gold: "#c7a44a",
  silver: "#c4c7c9",
  beige: "#e3d9c6",
  taupe: "#a79c8e",
  orange: "#d2703a",
  coral: "#e1735d",
  yellow: "#e3c04c",
  mustard: "#c9971f",
};

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[_/\\]+/g, " ")
    .replace(/[^a-z\s-]/g, "")
    .replace(/[-\s]+/g, " ")
    .trim();
}

/** Colour NAME → swatch, or null. Whole string, then first word, then last. */
function colorFromName(value: string): string | null {
  const normalized = normalizeName(value);
  if (!normalized) return null;
  const exact = GLOVE_COLOR_NAMES[normalized];
  if (exact) return exact;
  const words = normalized.split(" ").filter(Boolean);
  if (words.length < 2) return null;
  const first = words[0] ? GLOVE_COLOR_NAMES[words[0]] : undefined;
  if (first) return first;
  const last = words[words.length - 1];
  return (last ? GLOVE_COLOR_NAMES[last] : undefined) ?? null;
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
