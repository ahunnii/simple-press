import type { WealthTone } from "./wealth-block";
import type { WealthPhotoTreatment } from "./wealth-photo";
import { cn } from "~/lib/utils";

import { wealthToneClass } from "./wealth-block";
import { WealthPhoto } from "./wealth-photo";
import { WealthReveal } from "./wealth-reveal";

type WealthOverlapCardProps = {
  image: string;
  imageAlt: string;
  imagePosition?: string;
  treatment?: WealthPhotoTreatment;
  /** Image right, card left (homepage "Meet the Co-ops"). */
  mirrored?: boolean;
  /** Card color block. Defaults to surface (#F0F0F0). */
  tone?: WealthTone;
  /** Card content: eyebrow, `.wealth-display`, `.wealth-sub`,
   *  `.wealth-btn-row`. Direct children get rhythm spacing. */
  children: React.ReactNode;
  /** Scroll-reveal the photo and card (card staggered). Default true. */
  reveal?: boolean;
  className?: string;
};

/**
 * Redesign overlap card (`.wealth-overlap`): 12-column grid, the photo
 * spans 8 columns and the card overlaps the last two (or the first two
 * when `mirrored`). Phones: photo, then the card pulled up 51px over it.
 * The original `WealthOverlapHero` (`.wealth-overlap-grid`) is unchanged
 * for the pages that still use it.
 */
export function WealthOverlapCard({
  image,
  imageAlt,
  imagePosition,
  treatment = "none",
  mirrored = false,
  tone = "surface",
  children,
  reveal = true,
  className,
}: WealthOverlapCardProps) {
  const photo = (
    <WealthPhoto
      src={image}
      alt={imageAlt}
      treatment={treatment}
      objectPosition={imagePosition}
      sizes="(min-width: 900px) 66vw, 100vw"
      className="h-full w-full"
    />
  );
  const cardClass = cn("wealth-overlap__card", wealthToneClass(tone));
  return (
    <div
      className={cn(
        "wealth-overlap",
        mirrored && "wealth-overlap--mirrored",
        className,
      )}
    >
      {reveal ? (
        <WealthReveal className="wealth-overlap__media">{photo}</WealthReveal>
      ) : (
        <div className="wealth-overlap__media">{photo}</div>
      )}
      {reveal ? (
        <WealthReveal className={cardClass} delay={1}>
          {children}
        </WealthReveal>
      ) : (
        <div className={cardClass}>{children}</div>
      )}
    </div>
  );
}
