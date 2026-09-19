import { sectionGroupAttr } from "~/lib/preview/section-attrs";

import { UmscHeading } from "../shared/umsc-heading";
import { UmscGallery, type UmscGalleryData } from "../shared/umsc-gallery";
import { UmscSection } from "../shared/umsc-section";
import { UmscAboutCommunityPlaceholder } from "./umsc-about-community-placeholder";

type Props = {
  heading: string;
  gallery: UmscGalleryData | null;
};

/**
 * UmscAboutCommunity — design.md "About #5": h2 + the owner's Admin →
 * Galleries pick (her market/customer photos), rendered through the
 * umsc-native `UmscGallery` (`../shared/umsc-gallery`), which honors the
 * owner's layout/aspect/caption/lightbox settings — carousel and justified
 * fall back to the square grid, and the 16px shelf gap is fixed regardless
 * of the stored `gap` value. Cream band (`tone="cream"`), so it no longer
 * sits paper-on-paper directly under Values (`umsc-about-values.tsx`, also
 * `tone="paper"`). Hideable (`about.community`).
 *
 * "Empty = hidden" per design.md: when no gallery is picked, or the picked
 * gallery has no photos, this renders nothing on the public site. That
 * leaves an owner browsing a fresh store with no on-page hotspot for this
 * section's panel, so the same empty case instead renders
 * `UmscAboutCommunityPlaceholder`, which is itself a no-op outside the
 * editor preview iframe.
 */
export function UmscAboutCommunity({ heading, gallery }: Props) {
  if (!gallery || gallery.images.length === 0) {
    return <UmscAboutCommunityPlaceholder heading={heading} />;
  }

  return (
    <UmscSection
      tone="cream"
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
      <UmscGallery gallery={gallery} label={heading} />
    </UmscSection>
  );
}
