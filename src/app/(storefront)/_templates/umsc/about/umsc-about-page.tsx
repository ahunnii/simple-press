import type { DefaultAboutPageTemplateProps } from "../../types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { parseTemplateListRows } from "~/lib/template-fields";
import { db } from "~/server/db";
import { PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import { UmscPageHero } from "../shared/umsc-page-hero";
import { UMSC_ABOUT_DEFAULT_VALUES } from ".";
import { UmscAboutCommunity } from "./umsc-about-community";
import { UmscAboutCta } from "./umsc-about-cta";
import { UmscAboutMaker } from "./umsc-about-maker";
import { UmscAboutMission } from "./umsc-about-mission";
import { UmscAboutValues } from "./umsc-about-values";

// Re-exported so the pre-migration import path (and the snapshot test) keep
// working — the rows themselves now live in `./index.tsx`'s `defaultRows`.
export { UMSC_ABOUT_DEFAULT_VALUES };

const FIELD_KEYS = [
  "umsc.about.hero-heading",
  "umsc.about.hero-lede",
  "umsc.about.hero-image",
  "umsc.about.hero-image-alt",
  "umsc.about.maker-heading",
  "umsc.about.maker-body-1",
  "umsc.about.maker-body-2",
  "umsc.about.maker-body-3",
  "umsc.about.maker-image",
  "umsc.about.maker-image-alt",
  "umsc.about.maker-primary-label",
  "umsc.about.maker-primary-url",
  "umsc.about.maker-secondary-label",
  "umsc.about.maker-secondary-url",
  "umsc.about.mission-quote",
  "umsc.about.values-heading",
  "umsc.about.community-heading",
  "umsc.about.community-gallery",
  "umsc.about.cta-heading",
  "umsc.about.cta-button-label",
  "umsc.about.cta-button-url",
];

export async function UmscAboutPage({
  business,
}: DefaultAboutPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;
  const f = resolveFields(customFields, FIELD_KEYS);
  const { isEnabled } = await getBusinessFlags();

  const parsedValues = parseTemplateListRows(
    customFields?.["umsc.about.values"],
  );
  const values = parsedValues.length > 0 ? parsedValues : UMSC_ABOUT_DEFAULT_VALUES;

  const galleryId = f["umsc.about.community-gallery"]?.trim() ?? "";
  // GalleryFieldSelect stores the literal string "none" when the owner
  // picks "None" (template-field-widgets.tsx ~line 984-989) — guard it here
  // so we don't query the gallery table for a gallery literally named "none".
  const hasGallery = galleryId !== "" && galleryId !== "none";
  const gallery =
    hasGallery && isEnabled("galleries")
      ? await db.gallery.findUnique({
          where: { id: galleryId, businessId: business.id },
          include: { images: { orderBy: { sortOrder: "asc" } } },
        })
      : null;

  return (
    <PageTransition>
      <UmscPageHero
        heading={f["umsc.about.hero-heading"] ?? ""}
        headingFieldKey="umsc.about.hero-heading"
        lede={f["umsc.about.hero-lede"] ?? ""}
        ledeFieldKey="umsc.about.hero-lede"
        image={f["umsc.about.hero-image"] ?? undefined}
        imageAlt={f["umsc.about.hero-image-alt"] ?? ""}
        sectionAttrs={sectionGroupAttr("about", "hero")}
      />

      <UmscAboutMaker
        heading={f["umsc.about.maker-heading"] ?? ""}
        body1={f["umsc.about.maker-body-1"] ?? ""}
        body2={f["umsc.about.maker-body-2"] ?? ""}
        body3={f["umsc.about.maker-body-3"] ?? ""}
        image={f["umsc.about.maker-image"] ?? undefined}
        imageAlt={f["umsc.about.maker-image-alt"] ?? ""}
        primaryLabel={f["umsc.about.maker-primary-label"] ?? ""}
        primaryUrl={f["umsc.about.maker-primary-url"] ?? ""}
        secondaryLabel={f["umsc.about.maker-secondary-label"] ?? ""}
        secondaryUrl={f["umsc.about.maker-secondary-url"] ?? ""}
      />

      <UmscAboutMission quote={f["umsc.about.mission-quote"] ?? ""} />

      {isSectionVisible(customFields, "umsc", "about.values") && (
        <UmscAboutValues
          heading={f["umsc.about.values-heading"] ?? ""}
          values={values}
        />
      )}

      {isSectionVisible(customFields, "umsc", "about.community") && (
        <UmscAboutCommunity
          heading={f["umsc.about.community-heading"] ?? ""}
          gallery={gallery}
        />
      )}

      {isSectionVisible(customFields, "umsc", "about.cta") && (
        <UmscAboutCta
          heading={f["umsc.about.cta-heading"] ?? ""}
          buttonLabel={f["umsc.about.cta-button-label"] ?? ""}
          buttonUrl={f["umsc.about.cta-button-url"] ?? ""}
          businessName={business.name ?? ""}
        />
      )}
    </PageTransition>
  );
}
