import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";
import { GalleryRenderer } from "~/components/gallery-renderer";

import { DreamHeading } from "../shared/dream-heading";
import { DreamImageFallback } from "../shared/dream-image-fallback";
import { DreamLink } from "../shared/dream-link";
import { DreamSection } from "../shared/dream-section";

type GalleryData = {
  name?: string;
  description?: string | null;
  layout: string;
  columns: number;
  gap: number;
  showCaptions: boolean;
  enableLightbox: boolean;
  aspectRatio?: string | null;
  captionStyle?: string | null;
  images: Array<{
    id: string;
    url: string;
    altText?: string | null;
    caption?: string | null;
  }>;
};

type DreamHomepageGalleryProps = {
  heading: string;
  lede: string;
  gallery: GalleryData | null;
  emptyMessage: string;
  emptyLinkLabel: string;
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
    >
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

      <div className="dream-gallery mt-12">
        {hasImages && gallery ? (
          <GalleryRenderer gallery={{ ...gallery, layout: "masonry" }} />
        ) : (
          <div className="flex flex-col items-center gap-8 text-center">
            <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6">
              {EMPTY_TILE_ASPECTS.map((aspect, i) => (
                <div
                  key={i}
                  className={cn(
                    "overflow-hidden rounded-[var(--dream-radius-photo)] border border-[var(--dream-line)]",
                    i === 1 && "sm:mt-10",
                    i === 4 && "sm:mt-10",
                  )}
                  style={{ aspectRatio: aspect }}
                >
                  <DreamImageFallback className="h-full" />
                </div>
              ))}
            </div>
            <p
              className="max-w-[46ch] text-[var(--dream-soft)]"
              {...fieldAttr("dream.homepage.gallery-empty-message")}
            >
              {emptyMessage}
            </p>
            <DreamLink href="/contact">
              <span {...fieldAttr("dream.homepage.gallery-empty-link-label")}>
                {emptyLinkLabel}
              </span>
            </DreamLink>
          </div>
        )}
      </div>
    </DreamSection>
  );
}
