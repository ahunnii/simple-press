import type { CSSProperties } from "react";

import type { DreamGalleryData } from "../shared/dream-gallery-grid";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { DreamGalleryGrid } from "../shared/dream-gallery-grid";
import { DreamHeading } from "../shared/dream-heading";
import { DreamImageFallback } from "../shared/dream-image-fallback";
import { DreamLink } from "../shared/dream-link";
import { DreamReveal, DreamRevealGroup } from "../shared/dream-reveal";
import { DreamSection } from "../shared/dream-section";

type DreamHomepageGalleryProps = {
  heading: string;
  lede: string;
  gallery: DreamGalleryData | null;
  emptyMessage: string;
  emptyLinkLabel: string;
  /** Fixed destination for the empty-state link (the Estimate Quote page). */
  emptyLinkUrl: string;
  /** B2.5: false when `emptyLinkUrl` points at a flag-disabled route — hide the link, never swap its destination. */
  emptyLinkVisible: boolean;
};

/** Aspect ratios cycled across the six empty-state tiles for a masonry-ish rhythm. */
const EMPTY_TILE_ASPECTS = [
  "4 / 5",
  "1 / 1",
  "3 / 4",
  "1 / 1",
  "4 / 5",
  "3 / 4",
];

/**
 * design.md "Per-page section concepts › Homepage" #3: the owner-picked
 * gallery, forced to the masonry layout with its lightbox kept, or a
 * designed empty state (six tinted sky tiles + a line of copy + a link to
 * the Estimate Quote page) when no gallery is set or it has no photos yet.
 */
export function DreamHomepageGallery({
  heading,
  lede,
  gallery,
  emptyMessage,
  emptyLinkLabel,
  emptyLinkUrl,
  emptyLinkVisible,
}: DreamHomepageGalleryProps) {
  const hasImages = (gallery?.images.length ?? 0) > 0;

  return (
    <DreamSection
      sectionAttrs={{
        ...sectionGroupAttr("homepage", "gallery"),
        id: "gallery",
      }}
      tone="sky"
      aria-label="Gallery"
      reveal={false}
    >
      <DreamReveal>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <DreamHeading as="h2" fieldKey="dream.homepage.gallery-heading">
            {heading}
          </DreamHeading>
          <p
            className="max-w-[46ch] text-[var(--dream-soft)]"
            {...fieldAttr("dream.homepage.gallery-lede")}
          >
            {lede}
          </p>
        </div>
      </DreamReveal>

      {hasImages && gallery ? (
        <DreamGalleryGrid gallery={gallery} />
      ) : (
        <div className="dream-gallery mt-12">
          <div className="flex flex-col items-center gap-8 text-center">
            <DreamRevealGroup className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6">
              {EMPTY_TILE_ASPECTS.map((aspect, i) => (
                <div
                  key={i}
                  className={cn(
                    "dream-reveal-item overflow-hidden rounded-[var(--dream-radius-photo)] border border-[var(--dream-line)]",
                    i === 1 && "sm:mt-10",
                    i === 4 && "sm:mt-10",
                  )}
                  style={
                    {
                      aspectRatio: aspect,
                      "--i": Math.min(i, 7),
                    } as CSSProperties
                  }
                >
                  <DreamImageFallback className="h-full" />
                </div>
              ))}
            </DreamRevealGroup>
            <DreamReveal className="flex flex-col items-center gap-8">
              <p
                className="max-w-[46ch] text-[var(--dream-soft)]"
                {...fieldAttr("dream.homepage.gallery-empty-message")}
              >
                {emptyMessage}
              </p>
              {emptyLinkVisible && (
                <DreamLink href={emptyLinkUrl}>
                  <span
                    {...fieldAttr("dream.homepage.gallery-empty-link-label")}
                  >
                    {emptyLinkLabel}
                  </span>
                </DreamLink>
              )}
            </DreamReveal>
          </div>
        </div>
      )}
    </DreamSection>
  );
}
