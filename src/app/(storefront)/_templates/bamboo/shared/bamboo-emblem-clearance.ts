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
