/**
 * Every icon file served under `/site-icon/<file>`. All are generated from one
 * source image (see `./source`).
 */

export type IconBackground = { r: number; g: number; b: number; alpha: number };

export const TRANSPARENT: IconBackground = { r: 0, g: 0, b: 0, alpha: 0 };
const WHITE: IconBackground = { r: 255, g: 255, b: 255, alpha: 1 };

export type IconVariant = {
  contentType: "image/png" | "image/x-icon";
  /** One size for a PNG; several for the ICO container. */
  sizes: number[];
  background: IconBackground;
  /** Fraction of the edge left empty on each side (0.2 = 20%). */
  paddingPct: number;
};

export const ICON_VARIANTS = {
  "favicon.ico": {
    contentType: "image/x-icon",
    sizes: [16, 32, 48],
    background: TRANSPARENT,
    paddingPct: 0,
  },
  "icon-48.png": {
    contentType: "image/png",
    sizes: [48],
    background: TRANSPARENT,
    paddingPct: 0,
  },
  "icon-192.png": {
    contentType: "image/png",
    sizes: [192],
    background: TRANSPARENT,
    paddingPct: 0,
  },
  "icon-512.png": {
    contentType: "image/png",
    sizes: [512],
    background: TRANSPARENT,
    paddingPct: 0,
  },
  // iOS paints transparent pixels black, so the home-screen tile is opaque.
  "apple-touch-icon.png": {
    contentType: "image/png",
    sizes: [180],
    background: WHITE,
    paddingPct: 0.08,
  },
  // Android masks may crop to the central 80% circle.
  "icon-maskable-512.png": {
    contentType: "image/png",
    sizes: [512],
    background: WHITE,
    paddingPct: 0.2,
  },
} satisfies Record<string, IconVariant>;

export type IconVariantName = keyof typeof ICON_VARIANTS;

export function isIconVariantName(file: string): file is IconVariantName {
  return Object.hasOwn(ICON_VARIANTS, file);
}
