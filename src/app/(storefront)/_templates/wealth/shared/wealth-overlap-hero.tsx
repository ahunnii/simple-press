import Image from "next/image";

import { cn } from "~/lib/utils";

import { WealthReveal } from "./wealth-reveal";

type WealthOverlapHeroProps = {
  image: string;
  imageAlt: string;
  children: React.ReactNode;
  mirrored?: boolean;
  className?: string;
  /** Reveal the image on scroll (design.md: reveal applies to overlap-hero images). */
  reveal?: boolean;
};

/**
 * CSS-grid image/card overlap hero. The image and card share a middle grid
 * column on desktop so the card visually overlaps the image's trailing edge
 * — see `.wealth-overlap-grid` in globals.css. `mirrored` flips the whole
 * arrangement (image right, card left) via the CSS `direction: rtl` trick,
 * used for e.g. the homepage "Meet the Co-ops" section.
 *
 * NOTE for Phase 3: this component does not itself bleed the image to the
 * viewport edge (design.md: "photo pulled toward left/right edge"). Doing
 * that without negative margins or a transform-based breakout needs the
 * consuming page section to render this hero OUTSIDE the standard
 * `--wealth-container` padding on the image side. Phase 3 homepage/about
 * sections should wrap it accordingly; this tracer renders it at full
 * section width as a placeholder.
 */
export function WealthOverlapHero({
  image,
  imageAlt,
  children,
  mirrored = false,
  className,
  reveal = true,
}: WealthOverlapHeroProps) {
  const image_ = (
    <Image
      src={image}
      alt={imageAlt}
      fill
      sizes="(min-width: 860px) 55vw, 100vw"
    />
  );

  return (
    <div
      className={cn(
        "wealth-overlap-grid",
        mirrored && "wealth-overlap-grid--mirrored",
        className,
      )}
    >
      {/* `WealthReveal`'s own root div carries the grid-cell class directly
          (via `className`) rather than wrapping it, so it stays the direct
          grid child `.wealth-overlap-grid` expects for column/row placement. */}
      {reveal ? (
        <WealthReveal className="wealth-overlap-grid__image">
          {image_}
        </WealthReveal>
      ) : (
        <div className="wealth-overlap-grid__image">{image_}</div>
      )}
      <div className="wealth-overlap-grid__card">
        <div className="wealth-caption-card">{children}</div>
      </div>
    </div>
  );
}
