import { GalleryRenderer } from "~/components/gallery-renderer";

import { DreamReveal } from "./dream-reveal";

export type DreamGalleryData = {
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

/**
 * The owner-picked gallery, forced to the masonry layout with its lightbox
 * kept, inside the `.dream-gallery` wrapper that restyles the shared
 * `GalleryRenderer` (rounded hairline tiles, 1/2/3 columns). Shared by the
 * homepage gallery section and the `dream-lane` service page; the homepage's
 * designed empty state stays on the homepage only.
 *
 * The real tiles are rendered by the shared GalleryRenderer (not dream's to
 * restructure), so the populated gallery reveals as one block.
 */
export function DreamGalleryGrid({ gallery }: { gallery: DreamGalleryData }) {
  return (
    <div className="dream-gallery mt-12">
      <DreamReveal>
        <GalleryRenderer gallery={{ ...gallery, layout: "masonry" }} />
      </DreamReveal>
    </div>
  );
}
