/**
 * Color swatches for variant colors, shared by admin and the storefront
 * templates that draw color dots (glove, olive).
 *
 * A dot's color comes from, in order: the owner's per-product override
 * (`Product.additionalFields.colorSwatches`, keyed by the variant's color
 * value), then a name lookup against `BASE_PRODUCT_COLORS`. A name nothing
 * matches stays unknown on purpose; no color is ever invented.
 *
 * Pure module (no React, no server-only imports) so client components, the
 * validator and tests can all import it.
 */

export const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;

/** Max stored overrides per product (also enforced by the product validator). */
export const MAX_COLOR_SWATCHES = 100;

/** Variant color value → `#rrggbb`. */
export type ColorSwatches = Record<string, string>;

/** "Color", "Colors", "Colour", "Shade", "Finish"… name a color dimension. */
export function isColorOptionName(key: string): boolean {
  return /^(colou?rs?|colou?rway|shades?|finish)$/i.test(key.trim());
}

/**
 * Clean untrusted JSON into a swatch map: object only, trimmed non-empty
 * keys, six-digit hex values (lowercased), capped at MAX_COLOR_SWATCHES.
 */
export function sanitizeColorSwatches(raw: unknown): ColorSwatches {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: ColorSwatches = {};
  let count = 0;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (count >= MAX_COLOR_SWATCHES) break;
    const name = key.trim();
    if (!name || typeof value !== "string") continue;
    const hex = value.trim();
    if (!HEX_COLOR_RE.test(hex)) continue;
    out[name] = hex.toLowerCase();
    count += 1;
  }
  return out;
}

/** The product's stored overrides, from its `additionalFields` JSON. */
export function readColorSwatches(additionalFields: unknown): ColorSwatches {
  if (
    !additionalFields ||
    typeof additionalFields !== "object" ||
    Array.isArray(additionalFields)
  ) {
    return {};
  }
  return sanitizeColorSwatches(
    (additionalFields as Record<string, unknown>).colorSwatches,
  );
}

/** Override hex for a color value: exact key, then trimmed case-insensitive. */
export function swatchOverrideFor(
  map: ColorSwatches | undefined,
  value: string,
): string | undefined {
  if (!map) return undefined;
  const exact = map[value];
  if (exact) return exact;
  const wanted = value.trim().toLowerCase();
  if (!wanted) return undefined;
  for (const [key, hex] of Object.entries(map)) {
    if (key.trim().toLowerCase() === wanted) return hex;
  }
  return undefined;
}

/** Distinct trimmed values of color-named option keys, first-seen order. */
export function colorOptionValues(variants: { options: unknown }[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const variant of variants) {
    const options = variant.options;
    if (!options || typeof options !== "object" || Array.isArray(options)) {
      continue;
    }
    for (const [key, value] of Object.entries(
      options as Record<string, unknown>,
    )) {
      if (!isColorOptionName(key) || typeof value !== "string") continue;
      const trimmed = value.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      out.push(trimmed);
    }
  }
  return out;
}

/** Drop overrides for colors no variant uses any more (stored keys kept). */
export function pruneColorSwatches(
  map: ColorSwatches,
  variants: { options: unknown }[],
): ColorSwatches {
  const live = new Set(colorOptionValues(variants).map((v) => v.toLowerCase()));
  const out: ColorSwatches = {};
  for (const [key, hex] of Object.entries(map)) {
    if (live.has(key.trim().toLowerCase())) out[key] = hex;
  }
  return out;
}

/**
 * Built-in color names → hex. These are PRODUCT colors (the leather or fabric
 * an item is made from), not brand surfaces. Keys are normalized (see
 * `normalizeColorName`): lowercase, single spaces. Templates spread this and
 * add their own extras.
 */
export const BASE_PRODUCT_COLORS: Record<string, string> = {
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
  // Compound shades: matched as a whole before any single word, so
  // "Hunter Green" is not just "Green" and "Hot Pink" is not just "Pink".
  "hunter green": "#355e3b",
  "kelly green": "#4cbb17",
  sage: "#9caf9c",
  mint: "#a8d8b9",
  lime: "#8fcf3c",
  "army green": "#4b5320",
  "dark green": "#1f4d2b",
  "hot pink": "#e0218a",
  "baby pink": "#f4c2c2",
  "light pink": "#f6c6d0",
  "baby blue": "#a7c7e7",
  "sky blue": "#87ceeb",
  "light blue": "#9cc3e0",
  "royal blue": "#2a4bab",
  "navy blue": "#1f2a44",
  turquoise: "#30b5b0",
  "bluish purple": "#5b4fa8",
  mauve: "#b784a7",
  peach: "#f4b393",
  "rose gold": "#b76e79",
  bronze: "#8c6239",
  copper: "#b06c3a",
  khaki: "#bfae84",
  "off white": "#f5f2ea",
  "light grey": "#c9cbca",
  "light gray": "#c9cbca",
  "dark grey": "#4a4d4c",
  "dark gray": "#4a4d4c",
};

/** Lowercase, `_ / \` to spaces, letters/spaces/hyphens only, single spaces. */
export function normalizeColorName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[_/\\]+/g, " ")
    .replace(/[^a-z\s-]/g, "")
    .replace(/[-\s]+/g, " ")
    .trim();
}

const MAX_NAME_WINDOW = 3;

function lookup(dict: Record<string, string>, key: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(dict, key)
    ? dict[key]
    : undefined;
}

/**
 * Color NAME → hex from `dict`, or null. The whole normalized name first,
 * then the longest run of consecutive words the dictionary knows (3 words
 * down to 1, leftmost wins a tie): "Gold with Stones" → gold, "Deep Navy" →
 * navy. Names nothing matches return null.
 */
export function matchColorName(
  dict: Record<string, string>,
  value: string,
): string | null {
  const normalized = normalizeColorName(value);
  if (!normalized) return null;
  const whole = lookup(dict, normalized);
  if (whole) return whole;

  const words = normalized.split(" ");
  for (let size = Math.min(MAX_NAME_WINDOW, words.length); size >= 1; size--) {
    for (let start = 0; start + size <= words.length; start++) {
      const hit = lookup(dict, words.slice(start, start + size).join(" "));
      if (hit) return hit;
    }
  }
  return null;
}
