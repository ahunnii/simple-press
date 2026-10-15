import type { RouterOutputs } from "~/trpc/react";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { routeEnabled, routeFlags } from "~/lib/features/route-flags";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";

import { resolveFields } from "..";
import { DreamQuoteCta } from "../shared/dream-quote-cta";
import { DreamGenericPageBody } from "./dream-generic-page-body";
import { DREAM_PAGE_CTA_KEYS } from "./index";

type Business = NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
type Page = NonNullable<RouterOutputs["content"]["getPageBySlug"]>;

const FIELD_KEYS = Object.values(DREAM_PAGE_CTA_KEYS);

/** True when an internal href ("/estimate", "/estimate/?x#y") is `/${slug}`. */
function linksToPage(href: string, slug: string): boolean {
  const path = href.trim().split(/[?#]/)[0]?.replace(/\/+$/, "") ?? "";
  return path === `/${slug}`;
}

/**
 * GenericPage — renders arbitrary CMS `Page` records (any published page not
 * covered by a dedicated slot). Server component: the hero + CMS body (with
 * its scroll-spy TOC) is the client `DreamGenericPageBody`; this wrapper
 * adds the closing "Request an Estimate Quote" cloud band — the same
 * `DreamQuoteCta` that closes every service page — from the global
 * `global.page-cta` fields (see generic/index.ts). The band is a sibling
 * after the content section, full width, so its cloud deck melts into
 * paper exactly as on the service pages. Regular pages only (`page.type`
 * "page" / "custom"), never policies or blog posts.
 */
export async function DreamGenericPage({
  business,
  page,
}: {
  business: Business;
  page: Page;
}) {
  const customFields = business.siteContent?.customFields;
  const f = resolveFields(customFields, FIELD_KEYS);

  // Hideable section. A blank heading would leave an empty h2, so it hides
  // the band too.
  // The page the button points at (the /estimate default is itself a CMS
  // page) never invites the visitor to the page they're already on.
  const ctaHeading = (f[DREAM_PAGE_CTA_KEYS.heading] ?? "").trim();
  const showCta =
    (page.type === "page" || page.type === "custom") &&
    ctaHeading.length > 0 &&
    !linksToPage(f[DREAM_PAGE_CTA_KEYS.url] ?? "", page.slug) &&
    isSectionVisible(customFields, "dream", "global.page-cta");

  // An owner-typed link to a feature that is switched off would 404: drop the
  // button instead (B2.5). Flags are only fetched when the link actually
  // points at a gated route (the /estimate default needs no lookup).
  const ctaHref = showCta ? (f[DREAM_PAGE_CTA_KEYS.url] ?? "") : "";
  const gated = routeFlags(ctaHref).length > 0;
  const isEnabled = gated ? (await getBusinessFlags()).isEnabled : () => true;
  const ctaUrl =
    ctaHref !== "" && routeEnabled(ctaHref, isEnabled) ? ctaHref : "";

  return (
    <>
      <DreamGenericPageBody business={business} page={page} />

      {showCta && (
        <DreamQuoteCta
          heading={f[DREAM_PAGE_CTA_KEYS.heading] ?? ""}
          accent={f[DREAM_PAGE_CTA_KEYS.accent] ?? ""}
          lede={f[DREAM_PAGE_CTA_KEYS.lede] ?? ""}
          ctaLabel={f[DREAM_PAGE_CTA_KEYS.label] ?? ""}
          ctaUrl={ctaUrl}
          headingFieldKey={DREAM_PAGE_CTA_KEYS.heading}
          accentFieldKey={DREAM_PAGE_CTA_KEYS.accent}
          ledeFieldKey={DREAM_PAGE_CTA_KEYS.lede}
          ctaLabelFieldKey={DREAM_PAGE_CTA_KEYS.label}
          sectionAttrs={sectionGroupAttr("global", "page-cta")}
        />
      )}
    </>
  );
}
