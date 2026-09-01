/**
 * The ONE sanctioned way for a page to consume a symbol from
 * `bamboo-sprite.tsx`. Renders a `<use>` wrapper sized to the symbol's own
 * authored render dimensions.
 *
 * The gotcha this centralizes: several sprite symbols use a NEGATIVE-ORIGIN
 * viewBox on the `<symbol>` itself (e.g. `s-wreath` is
 * `viewBox="-80 -64 130 116"`) — that origin is correct ON the symbol, where
 * it centers the artwork around its own local (0,0). A `<use>` WRAPPER `<svg>`
 * must instead use `viewBox="0 0 W H"` (its own render box, width/height
 * taken from the symbol's viewBox 3rd/4th numbers) — reusing the symbol's
 * negative-origin viewBox on the wrapper double-applies the offset and
 * renders a fleck near the wrapper's edge or nothing at all.
 */
export const BAMBOO_GLYPH_IDS = [
  "s-leaf",
  "s-leaf-d",
  "s-leaf-l",
  "s-badge",
  "s-wreath",
  "s-roll-front",
  "s-roll-tall",
  "s-roll-top",
  "s-pack",
  "s-culm-tan",
  "s-culm-green",
  "s-culm-run",
  "s-pot",
  "s-pot-succ",
  "s-sprig",
  "s-tissue-box",
  "s-truck",
  "s-shops",
  "s-shield",
] as const;

export type BambooGlyphId = (typeof BAMBOO_GLYPH_IDS)[number];

/**
 * Render dimensions per symbol — the width/height (3rd/4th numbers) of each
 * symbol's own authored viewBox in `bamboo-sprite.tsx`. Exported so callers
 * that need the natural aspect ratio (e.g. to size a container before the
 * glyph renders) don't have to duplicate these numbers.
 */
export const BAMBOO_GLYPH_DIMENSIONS: Record<
  BambooGlyphId,
  { width: number; height: number }
> = {
  "s-leaf": { width: 102, height: 37 },
  "s-leaf-d": { width: 102, height: 37 },
  "s-leaf-l": { width: 102, height: 37 },
  "s-badge": { width: 72, height: 72 },
  "s-wreath": { width: 130, height: 116 },
  "s-roll-front": { width: 200, height: 192 },
  "s-roll-tall": { width: 200, height: 255 },
  "s-roll-top": { width: 200, height: 200 },
  "s-pack": { width: 330, height: 320 },
  "s-culm-tan": { width: 190, height: 540 },
  "s-culm-green": { width: 158, height: 412 },
  "s-culm-run": { width: 148, height: 1200 },
  "s-pot": { width: 150, height: 208 },
  "s-pot-succ": { width: 104, height: 124 },
  "s-sprig": { width: 172, height: 136 },
  "s-tissue-box": { width: 210, height: 168 },
  "s-truck": { width: 120, height: 120 },
  "s-shops": { width: 120, height: 120 },
  "s-shield": { width: 120, height: 120 },
};

type BambooGlyphProps = {
  id: BambooGlyphId;
  className?: string;
  /** Set to give the glyph an accessible name (role="img") instead of hiding it. */
  label?: string;
};

export function BambooGlyph({ id, className, label }: BambooGlyphProps) {
  const { width, height } = BAMBOO_GLYPH_DIMENSIONS[id];
  const viewBox = `0 0 ${width} ${height}`;

  if (label) {
    return (
      <svg
        viewBox={viewBox}
        className={className}
        role="img"
        aria-label={label}
      >
        <use href={`#${id}`} />
      </svg>
    );
  }

  return (
    <svg
      viewBox={viewBox}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <use href={`#${id}`} />
    </svg>
  );
}
