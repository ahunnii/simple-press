import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { GalleryRenderer } from "~/components/gallery-renderer";

import { UmscHeading } from "../shared/umsc-heading";
import { UmscReveal } from "../shared/umsc-reveal";
import { UmscSection } from "../shared/umsc-section";

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

type Props = {
  heading: string;
  gallery: GalleryData | null;
};

/**
 * UmscAboutCommunity — design.md "About #5": h2 + a `gallery` field forced
 * to a 4→2 grid layout (her market/customer photos). Hideable
 * (about.community); the page component only renders this when a gallery
 * with photos is actually picked — "empty = hidden" per design.md, unlike
 * homepage sections that design a visible empty state.
 */
export function UmscAboutCommunity({ heading, gallery }: Props) {
  if (!gallery || gallery.images.length === 0) return null;

  return (
    <UmscSection
      tone="paper"
      aria-label="Our customers, our community"
      sectionAttrs={sectionGroupAttr("about", "community")}
    >
      <UmscHeading
        as="h2"
        fieldKey="umsc.about.community-heading"
        className="mb-10"
      >
        {heading}
      </UmscHeading>
      <UmscReveal>
        <GalleryRenderer gallery={{ ...gallery, layout: "grid", columns: 4 }} />
      </UmscReveal>
    </UmscSection>
  );
}
