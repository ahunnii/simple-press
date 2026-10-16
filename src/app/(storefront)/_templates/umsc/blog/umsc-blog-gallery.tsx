import type { UmscGalleryData } from "../shared/umsc-gallery";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";

import { UmscGallery } from "../shared/umsc-gallery";
import { UmscGalleryPlaceholder } from "../shared/umsc-gallery-placeholder";
import { UmscHeading } from "../shared/umsc-heading";
import { UmscSection } from "../shared/umsc-section";

type Props = {
  heading: string;
  gallery: UmscGalleryData | null;
};

/**
 * UmscBlogGallery — the Community page's photo shelf (`blog.gallery`): h2 +
 * the owner's Admin → Galleries pick through the umsc-native `UmscGallery`,
 * on a cream band so it sits apart from the black page band above and the
 * paper post list below. Hideable.
 *
 * Same "empty = hidden" contract as `UmscAboutCommunity`: with no gallery
 * picked (or one with no photos) the public site shows nothing, and the
 * editor preview shows `UmscGalleryPlaceholder` so the section still has an
 * on-page hotspot.
 */
export function UmscBlogGallery({ heading, gallery }: Props) {
  if (!gallery || gallery.images.length === 0) {
    return (
      <UmscGalleryPlaceholder
        heading={heading}
        headingFieldKey="umsc.blog.gallery-heading"
        sectionAttrs={sectionGroupAttr("blog", "gallery")}
        ariaLabel="Community photos"
      />
    );
  }

  return (
    <UmscSection
      tone="cream"
      aria-label="Community photos"
      sectionAttrs={sectionGroupAttr("blog", "gallery")}
    >
      <UmscHeading
        as="h2"
        fieldKey="umsc.blog.gallery-heading"
        className="mb-10"
      >
        {heading}
      </UmscHeading>
      <UmscGallery gallery={gallery} label={heading} />
    </UmscSection>
  );
}
