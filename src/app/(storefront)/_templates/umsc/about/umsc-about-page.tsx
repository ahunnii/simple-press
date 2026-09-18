import type { DefaultAboutPageTemplateProps } from "../../types";
import type { TemplateListRow } from "~/lib/template-fields";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { parseTemplateListRows } from "~/lib/template-fields";
import { db } from "~/server/db";
import { PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import { UmscPageHero } from "../shared/umsc-page-hero";
import { UmscAboutCommunity } from "./umsc-about-community";
import { UmscAboutCta } from "./umsc-about-cta";
import { UmscAboutMaker } from "./umsc-about-maker";
import { UmscAboutMission } from "./umsc-about-mission";
import { UmscAboutValues } from "./umsc-about-values";

// Built-in example values, used when the owner hasn't configured any —
// her verbatim values from the current site (design.md "must-keep phrases").
const DEFAULT_VALUES: TemplateListRow[] = [
  {
    _id: "default-value-1",
    title: "Wellness & Relief",
    body: "Unique Monique prioritizes self-care by fostering a healthier and cleaner environment. Our products are specifically designed to soothe common respiratory issues, such as asthma and allergies, through the use of natural, pollution-free ingredients. Our triple-scented candles, wax melts, and laundry pods create soothing spaces that enhance both physical comfort and mental wellness.",
  },
  {
    _id: "default-value-2",
    title: "Eco-Conscious & Everyday",
    body: "Our commitment to sustainability ensures that our products benefit not only your health but also the environment. Unique Monique uses naturally sourced ingredients and sustainable packaging, allowing you to enjoy effective home-care solutions without environmental guilt. Our antibacterial laundry pods and bleach tablets are user-friendly and eco-friendly, offering busy families a cleaner, greener way to manage household needs without compromise.",
  },
  {
    _id: "default-value-3",
    title: "Community-Driven & Family-Focused",
    body: "As a proud Black woman-owned business, Unique Monique is deeply rooted in community support. Our product range caters to diverse needs — from calming candles for relaxation to convenient, chemical-free cleaning solutions that are gentle on your skin and safe for your airways. We promise quality you can trust for yourself and your family.",
  },
];

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
  const values = parsedValues.length > 0 ? parsedValues : DEFAULT_VALUES;

  const galleryId = f["umsc.about.community-gallery"]?.trim() ?? "";
  const gallery =
    galleryId && isEnabled("galleries")
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
        />
      )}
    </PageTransition>
  );
}
