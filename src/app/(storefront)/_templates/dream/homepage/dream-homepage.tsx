import { preload } from "react-dom";

import type { DefaultHomepageTemplateProps } from "../../types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { db } from "~/server/db";
import { HydrateClient } from "~/trpc/server";

import { resolveFields } from "..";
import { DREAM_CLOUD_PRESETS } from "../lib/cloud-presets";
import { DreamQuoteCta } from "../shared/dream-quote-cta";
import { DreamHomepageGallery } from "./dream-homepage-gallery";
import { DreamHomepageHero } from "./dream-homepage-hero";
import { DreamHomepageProcess } from "./dream-homepage-process";
import { toDreamQuoteChips } from "./dream-homepage-quote-chips";
import { DreamHomepageWhatWeDo } from "./dream-homepage-what-we-do";

const FIELD_KEYS = [
  // Hero
  "dream.homepage.hero-heading",
  "dream.homepage.hero-accent",
  "dream.homepage.hero-heading-after",
  "dream.homepage.hero-lede",
  "dream.homepage.hero-cta-label",
  "dream.homepage.hero-cta-url",
  "dream.homepage.hero-cta-secondary-label",
  "dream.homepage.hero-cta-secondary-url",
  "dream.homepage.hero-shelf-photo-1",
  "dream.homepage.hero-shelf-photo-1-alt",
  "dream.homepage.hero-shelf-photo-1-caption",
  "dream.homepage.hero-shelf-photo-2",
  "dream.homepage.hero-shelf-photo-2-alt",
  "dream.homepage.hero-shelf-photo-2-caption",
  "dream.homepage.hero-shelf-photo-3",
  "dream.homepage.hero-shelf-photo-3-alt",
  "dream.homepage.hero-shelf-photo-3-caption",
  "dream.homepage.hero-shelf-photo-4",
  "dream.homepage.hero-shelf-photo-4-alt",
  "dream.homepage.hero-shelf-photo-4-caption",
  "dream.homepage.hero-shelf-photo-5",
  "dream.homepage.hero-shelf-photo-5-alt",
  "dream.homepage.hero-shelf-photo-5-caption",
  "dream.homepage.hero-shelf-photo-6",
  "dream.homepage.hero-shelf-photo-6-alt",
  "dream.homepage.hero-shelf-photo-6-caption",
  // What We Do
  "dream.homepage.what-we-do-heading",
  "dream.homepage.what-we-do-lede",
  "dream.homepage.row-1-heading",
  "dream.homepage.row-1-body",
  "dream.homepage.row-1-link-label",
  "dream.homepage.row-1-link-url",
  "dream.homepage.row-1-photo",
  "dream.homepage.row-1-photo-alt",
  "dream.homepage.row-1-side-photo",
  "dream.homepage.row-1-side-photo-alt",
  "dream.homepage.row-2-heading",
  "dream.homepage.row-2-body",
  "dream.homepage.row-2-link-label",
  "dream.homepage.row-2-link-url",
  "dream.homepage.row-2-photo",
  "dream.homepage.row-2-photo-alt",
  "dream.homepage.row-2-side-photo",
  "dream.homepage.row-2-side-photo-alt",
  "dream.homepage.row-3-heading",
  "dream.homepage.row-3-body",
  "dream.homepage.row-3-link-label",
  "dream.homepage.row-3-link-url",
  "dream.homepage.row-3-photo",
  "dream.homepage.row-3-photo-alt",
  "dream.homepage.row-3-side-photo",
  "dream.homepage.row-3-side-photo-alt",
  // Gallery
  "dream.homepage.gallery-heading",
  "dream.homepage.gallery-lede",
  "dream.homepage.gallery",
  "dream.homepage.gallery-empty-message",
  "dream.homepage.gallery-empty-link-label",
  // Process
  "dream.homepage.process-heading",
  "dream.homepage.process-lede",
  "dream.homepage.process-step-1-heading",
  "dream.homepage.process-step-1-body",
  "dream.homepage.process-step-2-heading",
  "dream.homepage.process-step-2-body",
  "dream.homepage.process-step-3-heading",
  "dream.homepage.process-step-3-body",
  // Quote band
  "dream.homepage.quote-heading",
  "dream.homepage.quote-accent",
  "dream.homepage.quote-lede",
  "dream.homepage.quote-cta-label",
  "dream.homepage.quote-cta-url",
];

/**
 * Dream Your Theme homepage — five sections in design.md's render order:
 * hero (living sky, not hideable), What We Do, Gallery, From idea to theme,
 * and the Estimate Quote band (all hideable). A thin orchestrator: field
 * resolution, feature-flag/visibility gating, and render order live here;
 * each section's markup lives in its own file next to this one.
 */
export async function DreamHomepage({
  business,
}: DefaultHomepageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;
  const f = resolveFields(customFields, FIELD_KEYS);
  const { isEnabled } = await getBusinessFlags();

  // Performance contract (design.md "Motion"): preload the two eager hero
  // sprites (`<DreamClouds variant="hero" eager={2} />` above renders these
  // same first two entries with `loading="eager"`).
  const heroSprites = DREAM_CLOUD_PRESETS.hero;
  if (heroSprites[0]) preload(heroSprites[0].sprite, { as: "image" });
  if (heroSprites[1]) preload(heroSprites[1].sprite, { as: "image" });

  const businessName = business.name ?? "";
  const logoUrl =
    business.siteContent?.logoUrl ?? "/templates/dream/images/logo.webp";
  const logoAlt = resolveLogoAlt(
    business.siteContent?.logoAltText,
    businessName,
  );

  // Gallery (design.md #3): tenant-scoped lookup, gated on the `galleries`
  // feature flag, only when an owner has picked one.
  const galleryId = f["dream.homepage.gallery"]?.trim() ?? "";
  const gallery =
    galleryId && isEnabled("galleries")
      ? await db.gallery.findUnique({
          where: { id: galleryId, businessId: business.id },
          include: { images: { orderBy: { sortOrder: "asc" } } },
        })
      : null;

  const quoteChips = toDreamQuoteChips(
    customFields?.["dream.homepage.quote-chips"],
  );

  return (
    <HydrateClient>
      <>
        <DreamHomepageHero
          logoUrl={logoUrl}
          logoAlt={logoAlt}
          fields={{
            heading: f["dream.homepage.hero-heading"] ?? "",
            accent: f["dream.homepage.hero-accent"] ?? "",
            headingAfter: f["dream.homepage.hero-heading-after"] ?? "",
            lede: f["dream.homepage.hero-lede"] ?? "",
            ctaLabel: f["dream.homepage.hero-cta-label"] ?? "",
            ctaUrl: f["dream.homepage.hero-cta-url"] ?? "/contact",
            ctaSecondaryLabel:
              f["dream.homepage.hero-cta-secondary-label"] ?? "",
            ctaSecondaryUrl:
              f["dream.homepage.hero-cta-secondary-url"] ?? "#what-we-do",
            shelf: [
              {
                src:
                  f["dream.homepage.hero-shelf-photo-1"] ?? "/placeholder.svg",
                alt: f["dream.homepage.hero-shelf-photo-1-alt"] ?? "",
                caption: f["dream.homepage.hero-shelf-photo-1-caption"] ?? "",
                captionFieldKey: "dream.homepage.hero-shelf-photo-1-caption",
              },
              {
                src:
                  f["dream.homepage.hero-shelf-photo-2"] ?? "/placeholder.svg",
                alt: f["dream.homepage.hero-shelf-photo-2-alt"] ?? "",
                caption: f["dream.homepage.hero-shelf-photo-2-caption"] ?? "",
                captionFieldKey: "dream.homepage.hero-shelf-photo-2-caption",
              },
              {
                src:
                  f["dream.homepage.hero-shelf-photo-3"] ?? "/placeholder.svg",
                alt: f["dream.homepage.hero-shelf-photo-3-alt"] ?? "",
                caption: f["dream.homepage.hero-shelf-photo-3-caption"] ?? "",
                captionFieldKey: "dream.homepage.hero-shelf-photo-3-caption",
              },
              {
                src:
                  f["dream.homepage.hero-shelf-photo-4"] ?? "/placeholder.svg",
                alt: f["dream.homepage.hero-shelf-photo-4-alt"] ?? "",
                caption: f["dream.homepage.hero-shelf-photo-4-caption"] ?? "",
                captionFieldKey: "dream.homepage.hero-shelf-photo-4-caption",
              },
              {
                src:
                  f["dream.homepage.hero-shelf-photo-5"] ?? "/placeholder.svg",
                alt: f["dream.homepage.hero-shelf-photo-5-alt"] ?? "",
                caption: f["dream.homepage.hero-shelf-photo-5-caption"] ?? "",
                captionFieldKey: "dream.homepage.hero-shelf-photo-5-caption",
              },
              {
                src:
                  f["dream.homepage.hero-shelf-photo-6"] ?? "/placeholder.svg",
                alt: f["dream.homepage.hero-shelf-photo-6-alt"] ?? "",
                caption: f["dream.homepage.hero-shelf-photo-6-caption"] ?? "",
                captionFieldKey: "dream.homepage.hero-shelf-photo-6-caption",
              },
            ],
          }}
        />

        {isSectionVisible(customFields, "dream", "homepage.what-we-do") && (
          <DreamHomepageWhatWeDo
            heading={f["dream.homepage.what-we-do-heading"] ?? ""}
            lede={f["dream.homepage.what-we-do-lede"] ?? ""}
            rows={[
              {
                key: "row-1",
                heading: f["dream.homepage.row-1-heading"] ?? "",
                headingFieldKey: "dream.homepage.row-1-heading",
                body: f["dream.homepage.row-1-body"] ?? "",
                bodyFieldKey: "dream.homepage.row-1-body",
                linkLabel: f["dream.homepage.row-1-link-label"] ?? "",
                linkLabelFieldKey: "dream.homepage.row-1-link-label",
                linkUrl: f["dream.homepage.row-1-link-url"] ?? "/services",
                photo: f["dream.homepage.row-1-photo"] ?? "/placeholder.svg",
                photoAlt: f["dream.homepage.row-1-photo-alt"] ?? "",
                sidePhoto:
                  f["dream.homepage.row-1-side-photo"] ?? "/placeholder.svg",
                sidePhotoAlt: f["dream.homepage.row-1-side-photo-alt"] ?? "",
                variant: "text-image",
              },
              {
                key: "row-2",
                heading: f["dream.homepage.row-2-heading"] ?? "",
                headingFieldKey: "dream.homepage.row-2-heading",
                body: f["dream.homepage.row-2-body"] ?? "",
                bodyFieldKey: "dream.homepage.row-2-body",
                linkLabel: f["dream.homepage.row-2-link-label"] ?? "",
                linkLabelFieldKey: "dream.homepage.row-2-link-label",
                linkUrl: f["dream.homepage.row-2-link-url"] ?? "/services",
                photo: f["dream.homepage.row-2-photo"] ?? "/placeholder.svg",
                photoAlt: f["dream.homepage.row-2-photo-alt"] ?? "",
                sidePhoto:
                  f["dream.homepage.row-2-side-photo"] ?? "/placeholder.svg",
                sidePhotoAlt: f["dream.homepage.row-2-side-photo-alt"] ?? "",
                variant: "image-text",
              },
              {
                key: "row-3",
                heading: f["dream.homepage.row-3-heading"] ?? "",
                headingFieldKey: "dream.homepage.row-3-heading",
                body: f["dream.homepage.row-3-body"] ?? "",
                bodyFieldKey: "dream.homepage.row-3-body",
                linkLabel: f["dream.homepage.row-3-link-label"] ?? "",
                linkLabelFieldKey: "dream.homepage.row-3-link-label",
                linkUrl: f["dream.homepage.row-3-link-url"] ?? "/services",
                photo: f["dream.homepage.row-3-photo"] ?? "/placeholder.svg",
                photoAlt: f["dream.homepage.row-3-photo-alt"] ?? "",
                sidePhoto:
                  f["dream.homepage.row-3-side-photo"] ?? "/placeholder.svg",
                sidePhotoAlt: f["dream.homepage.row-3-side-photo-alt"] ?? "",
                variant: "text-image",
              },
            ]}
          />
        )}

        {isSectionVisible(customFields, "dream", "homepage.gallery") && (
          <DreamHomepageGallery
            heading={f["dream.homepage.gallery-heading"] ?? ""}
            lede={f["dream.homepage.gallery-lede"] ?? ""}
            gallery={gallery}
            emptyMessage={f["dream.homepage.gallery-empty-message"] ?? ""}
            emptyLinkLabel={f["dream.homepage.gallery-empty-link-label"] ?? ""}
          />
        )}

        {isSectionVisible(customFields, "dream", "homepage.process") && (
          <DreamHomepageProcess
            heading={f["dream.homepage.process-heading"] ?? ""}
            lede={f["dream.homepage.process-lede"] ?? ""}
            steps={[
              {
                heading: f["dream.homepage.process-step-1-heading"] ?? "",
                body: f["dream.homepage.process-step-1-body"] ?? "",
              },
              {
                heading: f["dream.homepage.process-step-2-heading"] ?? "",
                body: f["dream.homepage.process-step-2-body"] ?? "",
              },
              {
                heading: f["dream.homepage.process-step-3-heading"] ?? "",
                body: f["dream.homepage.process-step-3-body"] ?? "",
              },
            ]}
          />
        )}

        {isSectionVisible(customFields, "dream", "homepage.quote") && (
          <DreamQuoteCta
            sectionAttrs={sectionGroupAttr("homepage", "quote")}
            heading={f["dream.homepage.quote-heading"] ?? ""}
            accent={f["dream.homepage.quote-accent"] ?? ""}
            lede={f["dream.homepage.quote-lede"] ?? ""}
            chips={quoteChips}
            ctaLabel={f["dream.homepage.quote-cta-label"] ?? ""}
            ctaUrl={f["dream.homepage.quote-cta-url"] ?? "/contact"}
            headingFieldKey="dream.homepage.quote-heading"
            accentFieldKey="dream.homepage.quote-accent"
            ledeFieldKey="dream.homepage.quote-lede"
            ctaLabelFieldKey="dream.homepage.quote-cta-label"
          />
        )}
      </>
    </HydrateClient>
  );
}
