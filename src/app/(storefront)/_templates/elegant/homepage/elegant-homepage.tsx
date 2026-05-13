import {
  getListFieldValue,
  parseTemplateIconListRows,
} from "~/lib/template-fields";
import { api } from "~/trpc/server";

import { DEFAULT_ELEGANT_TRUST_BADGES, resolveFields } from "..";
import { ElegantFeatureSection } from "./elegant-feature-section";
import { ElegantHero } from "./elegant-hero";
import { ElegantProductGrid } from "./elegant-product-grid";
import { ElegantTrustBadges } from "./elegant-trust-badges";

export async function ElegantHomePage() {
  const homepage = await api.business.getHomepage();

  const f = resolveFields(homepage?.siteContent?.customFields, [
    "elegant.homepage.hero-image",
    "elegant.homepage.hero-title-line-1",
    "elegant.homepage.hero-title-line-2",
    "elegant.homepage.hero-description",
    "elegant.homepage.hero-button-text",
    "elegant.homepage.hero-button-link",
    "elegant.homepage.about.title",
    "elegant.homepage.about.text",
    "elegant.homepage.about.image",
    "elegant.homepage.feature-1-title",
    "elegant.homepage.feature-1-description",
    "elegant.homepage.feature-2-title",
    "elegant.homepage.feature-2-description",
    "elegant.homepage.feature-3-title",
    "elegant.homepage.feature-3-description",
    "elegant.homepage.feature-4-title",
    "elegant.homepage.feature-4-description",
    "elegant.cta.background",
    "elegant.cta.title",
    "elegant.cta.pointone",
    "elegant.cta.pointtwo",
    "elegant.cta.pointthree",
    "elegant.homepage.hero-use-video",
    "elegant.homepage.hero-video",
    "elegant.homepage.hero-tagline",
    "elegant.homepage.products-tagline",
    "elegant.homepage.products-title",
    "elegant.homepage.products-description",
    "elegant.homepage.products-button-text",
    "elegant.homepage.products-button-link",
    "elegant.homepage.about.video",
    "elegant.homepage.about.image",
    "elegant.homepage.about.tagline",
  ]);

  return (
    <>
      {/* <ElegantHeader /> */}
      <ElegantHero
        homepage={homepage}
        tagline={f["elegant.homepage.hero-tagline"]}
        heroImage={f["elegant.homepage.hero-image"]}
        heroVideo={f["elegant.homepage.hero-video"]}
        heroTitleLine1={f["elegant.homepage.hero-title-line-1"]}
        heroTitleLine2={f["elegant.homepage.hero-title-line-2"]}
        heroDescription={f["elegant.homepage.hero-description"]}
        heroButtonText={f["elegant.homepage.hero-button-text"]}
        heroButtonLink={f["elegant.homepage.hero-button-link"]}
      />
      <ElegantTrustBadges homepage={homepage} />
      <ElegantProductGrid
        homepage={homepage}
        productsTagline={f["elegant.homepage.products-tagline"]}
        productsTitle={f["elegant.homepage.products-title"]}
        productsDescription={f["elegant.homepage.products-description"]}
        productsButtonText={f["elegant.homepage.products-button-text"]}
        productsButtonLink={f["elegant.homepage.products-button-link"]}
      />
      <ElegantFeatureSection
        homepage={homepage}
        aboutTagline={f["elegant.homepage.about.tagline"]}
        aboutVideo={f["elegant.homepage.about.video"]}
        aboutImage={f["elegant.homepage.about.image"]}
        aboutTitle={f["elegant.homepage.about.title"]}
        aboutText={f["elegant.homepage.about.text"]}
      />
      {/* <ElegantTestimonials /> */}
      {/* <ElegantCTABanner /> */}
      {/* <ElegantNewsletter /> */}
      {/* <ElegantFooter /> */}
    </>
  );
}
