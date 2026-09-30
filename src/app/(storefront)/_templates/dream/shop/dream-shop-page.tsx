import { Suspense } from "react";

import type { DefaultProductsPageTemplateProps } from "../../types";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";

import { DreamPageHero } from "../shared/dream-page-hero";
import { DreamSection } from "../shared/dream-section";
import { DreamEmptyPanel } from "./dream-empty-panel";
import { DreamShopFilterClient } from "./dream-shop-filter-client";
import { resolveDreamShopFields } from "./index";

const FALLBACK_LOGO = "/templates/dream/images/logo.webp";

const FIELD_KEYS = [
  "dream.shop.hero-heading",
  "dream.shop.hero-accent",
  "dream.shop.hero-lede",
  "dream.shop.empty-heading",
  "dream.shop.empty-body",
  "dream.shop.empty-cta-label",
  "dream.shop.empty-cta-url",
  "dream.shop.no-results",
];

/**
 * `/shop` — the catalogue on dream's page system: the interior-page sky
 * hero (same band as `/services`), then the product grid inside the dream
 * container so its left edge matches the header's (B1.7). Filter, sort,
 * and pagination logic is Default's, via the shared `useShopFilters` hook
 * in the client toolbar.
 *
 * The grid section skips `DreamSection`'s wrapper reveal on purpose: a
 * tall grid never reaches the reveal's 10% visibility threshold at first
 * paint, which would leave products invisible below the fold.
 */
export function DreamShopPage({ business }: DefaultProductsPageTemplateProps) {
  const customFields = business.siteContent?.customFields;
  const f = resolveDreamShopFields(customFields, FIELD_KEYS);
  const products = business.products ?? [];

  const logoUrl = business.siteContent?.logoUrl ?? FALLBACK_LOGO;
  const logoAlt = resolveLogoAlt(
    business.siteContent?.logoAltText,
    business.name ?? "",
  );

  return (
    <>
      <DreamPageHero
        logoUrl={logoUrl}
        logoAlt={logoAlt}
        title={f["dream.shop.hero-heading"] ?? ""}
        accent={f["dream.shop.hero-accent"] ?? ""}
        lede={f["dream.shop.hero-lede"] ?? ""}
        titleFieldKey="dream.shop.hero-heading"
        accentFieldKey="dream.shop.hero-accent"
        ledeFieldKey="dream.shop.hero-lede"
        sectionAttrs={sectionGroupAttr("shop", "hero")}
      />

      <DreamSection
        sectionAttrs={sectionGroupAttr("shop", "grid")}
        aria-label="Products"
        reveal={false}
      >
        {products.length === 0 ? (
          <DreamEmptyPanel
            heading={f["dream.shop.empty-heading"] ?? ""}
            body={f["dream.shop.empty-body"] ?? ""}
            ctaLabel={f["dream.shop.empty-cta-label"] ?? ""}
            ctaHref={f["dream.shop.empty-cta-url"] ?? ""}
            headingFieldKey="dream.shop.empty-heading"
            bodyFieldKey="dream.shop.empty-body"
            ctaLabelFieldKey="dream.shop.empty-cta-label"
          />
        ) : (
          <Suspense>
            <DreamShopFilterClient
              products={products}
              noResults={f["dream.shop.no-results"] ?? ""}
            />
          </Suspense>
        )}
      </DreamSection>
    </>
  );
}
