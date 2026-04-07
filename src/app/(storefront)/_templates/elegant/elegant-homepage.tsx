import { api } from "~/trpc/server";
import { resolveFields } from ".";

import { ElegantCTABanner } from "./elegant-cta-banner";
import { ElegantFeatureSection } from "./elegant-feature-section";
import { ElegantFooter } from "./elegant-footer";
import { ElegantHeader } from "./elegant-header";
import { ElegantHero } from "./elegant-hero";
import { ElegantNewsletter } from "./elegant-newsletter";
import { ElegantProductGrid } from "./elegant-product-grid";
import { ElegantTestimonials } from "./elegant-testimonials";
import { ElegantTrustBadges } from "./elegant-trust-badges";

export async function ElegantHomePage() {
  const homepage = await api.business.getHomepage();

  const f = resolveFields(homepage?.siteContent?.customFields, [
    "elegant.tagline",
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
  ]);

  return (
    <>
      {/* <ElegantHeader /> */}
      <ElegantHero
        homepage={homepage}
        tagline={f["elegant.tagline"]}
        heroImage={f["elegant.homepage.hero-image"]}
        heroTitleLine1={f["elegant.homepage.hero-title-line-1"]}
        heroTitleLine2={f["elegant.homepage.hero-title-line-2"]}
        heroDescription={f["elegant.homepage.hero-description"]}
        heroButtonText={f["elegant.homepage.hero-button-text"]}
        heroButtonLink={f["elegant.homepage.hero-button-link"]}
      />
      {/* <ElegantTrustBadges /> */}
      <ElegantProductGrid homepage={homepage} />
      <ElegantFeatureSection
        homepage={homepage}
        aboutTitle={f["elegant.homepage.about.title"] ?? ""}
        aboutText={f["elegant.homepage.about.text"] ?? ""}
        features={[
          {
            title: f["elegant.homepage.feature-1-title"] ?? "",
            description: f["elegant.homepage.feature-1-description"] ?? "",
          },
          {
            title: f["elegant.homepage.feature-2-title"] ?? "",
            description: f["elegant.homepage.feature-2-description"] ?? "",
          },
          {
            title: f["elegant.homepage.feature-3-title"] ?? "",
            description: f["elegant.homepage.feature-3-description"] ?? "",
          },
          {
            title: f["elegant.homepage.feature-4-title"] ?? "",
            description: f["elegant.homepage.feature-4-description"] ?? "",
          },
        ]}
      />
      {/* <ElegantTestimonials /> */}
      {/* <ElegantCTABanner /> */}
      {/* <ElegantNewsletter /> */}
      {/* <ElegantFooter /> */}
    </>
  );
}
