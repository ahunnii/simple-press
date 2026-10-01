/**
 * Emblem clearance for the top of every bamboo page.
 *
 * The header's circular emblem (see `layout/bamboo-header.tsx`) sits at
 * `top-2` and, expanded (unscrolled), is `lg:size-36 xl:size-44` on the
 * homepage but a constant `lg:size-36` on every other page. Against the
 * `lg:h-20` (80px) forest bar the inner-page emblem therefore overhangs by
 * 72px at every lg+ width (8 + 144 - 80). It's horizontally centered, so it
 * sits directly over whatever the first section renders.
 *
 * Below lg the bar shrinks to a mini version of the same seal: `size-20`
 * (80px) at the same `top-2`, against a 64px `h-16` bar — an overhang of
 * 24px (8 + 80 - 64). That's small enough that globals.css's base (below
 * lg) fallback rule for `#bamboo-main-content:not(:has(.bam-top))` just pads
 * 1.5rem (24px) rather than needing a per-page `BAMBOO_EMBLEM_CLEAR`-style
 * constant; bamboo pages' own first sections were checked per-page in QA and
 * already carry ≥48px of top padding at sub-lg, which clears it with room to
 * spare. Once compact (scrolled), the disc docks fully inside the bar
 * (`size-12`, 8 + 48 = 56 within 64) and there's no overhang to clear at all.
 *
 * If the emblem's size or `top` offset in `bamboo-header.tsx` ever changes,
 * these values must be recomputed to match.
 */

/**
 * Marker class carried by the first section of EVERY bamboo-owned page. The
 * `.bamboo` block in globals.css pads `#bamboo-main-content` at lg+ whenever
 * no descendant carries it — i.e. on routes that fall back to Default pages
 * (wishlist, FAQ, order status, ...), which know nothing about the emblem.
 * A bamboo page missing the marker would get that extra padding too.
 */
export const BAMBOO_TOP_MARKER = "bam-top";

/**
 * Marker plus `lg:pt-24` (96px = 72px overhang + 24px breathing room). Apply
 * via `cn()` to the first section of a bamboo page whose own top padding is
 * below that; it overrides `py-*` at lg+ only, leaving bottom padding alone.
 * Pages whose first section already clears the emblem (the homepage hero,
 * `shared/bamboo-page-hero.tsx`) take just `BAMBOO_TOP_MARKER`.
 */
export const BAMBOO_EMBLEM_CLEAR = `${BAMBOO_TOP_MARKER} lg:pt-24`;
