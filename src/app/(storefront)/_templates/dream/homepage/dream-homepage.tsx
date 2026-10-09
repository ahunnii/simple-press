import { preload } from "react-dom";

import type { DefaultHomepageTemplateProps } from "../../types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { resolvePopup } from "~/lib/site-banner/resolve";
import { isSectionVisible } from "~/lib/sp-meta";
import { db } from "~/server/db";
import { HydrateClient } from "~/trpc/server";
import { navHrefOffFlag } from "~/app/(storefront)/_components/nav/nav-flags";

import { resolveFields } from "..";
import { DREAM_CLOUD_PRESETS } from "../lib/cloud-presets";
import { DreamQuoteCta } from "../shared/dream-quote-cta";
import { DREAM_QUOTE_HREF } from "../shared/dream-quote-href";
import { resolveDreamStepsList } from "../shared/dream-steps-list";
import { DreamHomepageGallery } from "./dream-homepage-gallery";
import { DreamHomepageHero } from "./dream-homepage-hero";
import { DreamHomepageProcess } from "./dream-homepage-process";
import { toDreamQuoteChips } from "./dream-homepage-quote-chips";
import { resolveDreamHeroShelf } from "./dream-homepage-shelf";
import { DreamHomepageWhatWeDo } from "./dream-homepage-what-we-do";
import { resolveDreamWhatWeDoRows } from "./dream-homepage-what-we-do-rows";
import { DreamPopup } from "./dream-popup";
import { DREAM_PROCESS_STEPS_DEFAULT_ROWS } from "./index";

const DREAM_PROCESS_STEPS_KEY = "dream.homepage.process-steps";

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
  // What We Do
  "dream.homepage.what-we-do-heading",
  "dream.homepage.what-we-do-lede",
  // Gallery
  "dream.homepage.gallery-heading",
  "dream.homepage.gallery-lede",
  "dream.homepage.gallery",
  "dream.homepage.gallery-empty-message",
  "dream.homepage.gallery-empty-link-label",
  // Process
  "dream.homepage.process-heading",
  "dream.homepage.process-lede",
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

  // B2.4: the owner's announcement popup — same source/shape every other
  // template's homepage uses (`business.siteContent.popupConfig`, gated on
  // the `popups` flag).
  const popup = resolvePopup(business.siteContent, isEnabled);

  // B2.5: a field-driven CTA/link must be HIDDEN (never redirected) when its
  // destination route's own feature flag is off — e.g. a "What We Do" row
  // pointed at `/services` while `services` is disabled would otherwise
  // 404. `resolveFields` already applies each key's registered default
  // (declared in this domain's `index.ts`, e.g. "/services", "/estimate"),
  // so `f[key] ?? ""` alone is the resolved href — never a second
  // `?? "/services"`-style literal fallback, which would silently point an
  // always-rendered link at a route that may be gated off.
  const ctaFlagOk = (href: string): boolean => {
    const flag = navHrefOffFlag(href, isEnabled);
    return flag === null || isEnabled(flag);
  };
  const ctaVisible = (href: string): boolean =>
    href.trim().length > 0 && ctaFlagOk(href);

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

  const heroCtaUrl = f["dream.homepage.hero-cta-url"] ?? "";
  const heroCtaSecondaryUrl = f["dream.homepage.hero-cta-secondary-url"] ?? "";
  const galleryEmptyLinkUrl = DREAM_QUOTE_HREF;
  const quoteCtaUrl = f["dream.homepage.quote-cta-url"] ?? "";

  return (
    <HydrateClient>
      <>
        {popup && <DreamPopup popup={popup} />}

        <DreamHomepageHero
          logoUrl={logoUrl}
          logoAlt={logoAlt}
          fields={{
            heading: f["dream.homepage.hero-heading"] ?? "",
            accent: f["dream.homepage.hero-accent"] ?? "",
            headingAfter: f["dream.homepage.hero-heading-after"] ?? "",
            lede: f["dream.homepage.hero-lede"] ?? "",
            ctaLabel: f["dream.homepage.hero-cta-label"] ?? "",
            ctaUrl: heroCtaUrl,
            ctaVisible: ctaVisible(heroCtaUrl),
            ctaSecondaryLabel:
              f["dream.homepage.hero-cta-secondary-label"] ?? "",
            ctaSecondaryUrl: heroCtaSecondaryUrl,
            ctaSecondaryVisible: ctaVisible(heroCtaSecondaryUrl),
            shelf: resolveDreamHeroShelf(customFields),
          }}
        />

        {isSectionVisible(customFields, "dream", "homepage.what-we-do") && (
          <DreamHomepageWhatWeDo
            heading={f["dream.homepage.what-we-do-heading"] ?? ""}
            lede={f["dream.homepage.what-we-do-lede"] ?? ""}
            rows={resolveDreamWhatWeDoRows(customFields).map((row) => ({
              ...row,
              // B2.5: a link needs a label, and its route's flag must be on.
              linkVisible: row.linkLabel !== "" && ctaVisible(row.linkUrl),
            }))}
          />
        )}

        {isSectionVisible(customFields, "dream", "homepage.gallery") && (
          <DreamHomepageGallery
            heading={f["dream.homepage.gallery-heading"] ?? ""}
            lede={f["dream.homepage.gallery-lede"] ?? ""}
            gallery={gallery}
            emptyMessage={f["dream.homepage.gallery-empty-message"] ?? ""}
            emptyLinkLabel={f["dream.homepage.gallery-empty-link-label"] ?? ""}
            emptyLinkUrl={galleryEmptyLinkUrl}
            emptyLinkVisible={ctaVisible(galleryEmptyLinkUrl)}
          />
        )}

        {isSectionVisible(customFields, "dream", "homepage.process") && (
          <DreamHomepageProcess
            heading={f["dream.homepage.process-heading"] ?? ""}
            lede={f["dream.homepage.process-lede"] ?? ""}
            steps={resolveDreamStepsList(
              customFields,
              DREAM_PROCESS_STEPS_KEY,
              DREAM_PROCESS_STEPS_DEFAULT_ROWS,
            )}
          />
        )}

        {isSectionVisible(customFields, "dream", "homepage.quote") && (
          <DreamQuoteCta
            sectionAttrs={sectionGroupAttr("homepage", "quote")}
            heading={f["dream.homepage.quote-heading"] ?? ""}
            accent={f["dream.homepage.quote-accent"] ?? ""}
            lede={f["dream.homepage.quote-lede"] ?? ""}
            chips={quoteChips}
            chipsFieldKey="dream.homepage.quote-chips"
            ctaLabel={f["dream.homepage.quote-cta-label"] ?? ""}
            // B2.5: hide just the button when it points at a flag-off route
            ctaUrl={ctaVisible(quoteCtaUrl) ? quoteCtaUrl : ""}
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
