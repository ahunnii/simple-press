import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

import { BAMBOO_TOP_MARKER } from "./bamboo-emblem-clearance";

type Props = {
  children: ReactNode;
  /**
   * `"default"` — the title shelf (shop, cart, checkout): eyebrow/h1/lede
   * centered or left-aligned content, tall enough to clear the emblem with
   * room to breathe. `"compact"` — the breadcrumb shelf (product page): a
   * short back-link row, just tall enough to clear the emblem without the
   * extra breathing room a title needs.
   */
  variant?: "default" | "compact";
  className?: string;
};

/**
 * Full-bleed cream-deep "top shelf" that every bamboo inner-page top now
 * renders into, so the header's circular emblem — which hangs 72px below
 * the 80px forest bar at lg+ on every inner page (see
 * `shared/bamboo-emblem-clearance.ts`) — always overhangs a deliberate band
 * instead of floating over plain cream. The band holds the page's
 * title/breadcrumb; page content continues on flat cream below it.
 *
 * Structure: this outer `<div>` carries the cream-deep background, the
 * hairline bottom border, and all vertical padding; a child
 * `mx-auto max-w-7xl px-4 lg:px-8` container centers the content
 * horizontally. Background never lands on the centered container (the
 * "white-strip gutters" bug the backgrounds convention in
 * docs/templates/bamboo/design.md forbids) — it's full-bleed on this
 * element, same as `shared/bamboo-page-hero.tsx`.
 *
 * This element is always the page's first element and carries
 * `BAMBOO_TOP_MARKER` (`bam-top`) directly — never `BAMBOO_EMBLEM_CLEAR`'s
 * `lg:pt-24` verbatim for the compact variant, since its own padding
 * already clears the emblem with a different, shorter number. The globals.css
 * `.bamboo #bamboo-main-content:not(:has(.bam-top))` rule uses this marker to
 * skip its fallback top padding, which exists only for Default-template
 * fallback routes (wishlist, FAQ, order status, ...) that know nothing about
 * the emblem.
 *
 * Vertical padding by variant (both derived from the emblem overhang):
 * - `"default"`: `pt-12 pb-12 md:pb-16` below lg; at lg the whole
 *   `lg:pt-24` (96px = 72px overhang + 24px breathing room) from
 *   `BAMBOO_EMBLEM_CLEAR` takes over — bottom padding is untouched, since
 *   that constant only overrides top padding at lg+.
 * - `"compact"`: `py-4` below lg; at lg, `lg:pt-14 lg:pb-2`
 *   (56px + 8px = 64px of padding) around the back-link's `size="sm"`
 *   ghost button (`h-8` = 32px) totals 96px — the same ≥96px floor the
 *   default variant hits, so the band's bottom edge sits ≥24px below the
 *   emblem's bottom edge either way. The back link sits at the shelf's
 *   left edge, so it never collides with the centered emblem above it.
 *
 * The shelf's own bottom edge (`border-b border-[var(--bam-hairline)]`)
 * is a FLAT hairline seam into the cream section that follows — per the
 * "signature seams" guardrail in docs/templates/bamboo/design.md, a
 * cream ↔ cream-deep seam never gets a decorative wave; only cream/cream-deep
 * ↔ forest seams do.
 */
export function BambooPageShelf({
  children,
  variant = "default",
  className,
}: Props) {
  return (
    <div
      className={cn(
        BAMBOO_TOP_MARKER,
        "w-full bg-[var(--bam-cream-deep)] border-b border-[var(--bam-hairline)]",
        variant === "default"
          ? "pt-12 pb-12 md:pb-16 lg:pt-24"
          : "py-4 lg:pt-14 lg:pb-2",
        className,
      )}
    >
      <div className="mx-auto max-w-7xl px-4 lg:px-8">{children}</div>
    </div>
  );
}
