import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { api } from "~/trpc/server";

import { resolveFields } from "..";
import { ElegantCTABanner } from "./elegant-cta-banner";
import { ElegantFeatureSection } from "./elegant-feature-section";
import { ElegantHero } from "./elegant-hero";
import { ElegantNewsletter } from "./elegant-newsletter";
import { ElegantProductGrid } from "./elegant-product-grid";
import { ElegantTestimonials } from "./elegant-testimonials";
import { ElegantTrustBadges } from "./elegant-trust-badges";

export async function ElegantHomePage() {
  const [homepage, flags] = await Promise.all([
    api.business.getHomepage(),
    getBusinessFlags(),
  ]);

  const testimonials = flags.isEnabled("testimonials")
    ? await api.testimonial.listRandom({ limit: 9 })
    : [];

  const customFields = homepage?.siteContent?.customFields;

  const f = resolveFields(customFields, [
    "elegant.homepage.hero-image",
    "elegant.homepage.hero-title-line-1",
    "elegant.homepage.hero-title-line-2",
    "elegant.homepage.hero-description",
    "elegant.homepage.hero-button-text",
    "elegant.homepage.hero-button-link",
    "elegant.homepage.hero-secondary-button-text",
    "elegant.homepage.hero-secondary-button-link",
    "elegant.homepage.hero-video",
    "elegant.homepage.hero-tagline",
    "elegant.homepage.products-tagline",
    "elegant.homepage.products-title",
    "elegant.homepage.products-description",
    "elegant.homepage.products-button-text",
    "elegant.homepage.products-button-link",
    "elegant.homepage.about.tagline",
    "elegant.homepage.about.title",
    "elegant.homepage.about.text",
    "elegant.homepage.about.image",
    "elegant.homepage.about.video",
    "elegant.homepage.about.button-text",
    "elegant.homepage.about.button-link",
  ]);

  return (
    <>
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
        heroSecondaryButtonText={
          f["elegant.homepage.hero-secondary-button-text"]
        }
        heroSecondaryButtonLink={
          f["elegant.homepage.hero-secondary-button-link"]
        }
        sectionAttrs={sectionGroupAttr("homepage", "hero")}
      />

      {isSectionVisible(customFields, "elegant", "homepage.trust-badges") && (
        <ElegantTrustBadges
          homepage={homepage}
          sectionAttrs={sectionGroupAttr("homepage", "trust-badges")}
        />
      )}

      {isSectionVisible(customFields, "elegant", "homepage.products") && (
        <ElegantProductGrid
          homepage={homepage}
          productsTagline={f["elegant.homepage.products-tagline"]}
          productsTitle={f["elegant.homepage.products-title"]}
          productsDescription={f["elegant.homepage.products-description"]}
          productsButtonText={f["elegant.homepage.products-button-text"]}
          productsButtonLink={f["elegant.homepage.products-button-link"]}
          sectionAttrs={sectionGroupAttr("homepage", "products")}
        />
      )}

      {isSectionVisible(customFields, "elegant", "homepage.about") && (
        <ElegantFeatureSection
          homepage={homepage}
          aboutTagline={f["elegant.homepage.about.tagline"]}
          aboutImage={f["elegant.homepage.about.image"]}
          aboutVideo={f["elegant.homepage.about.video"]}
          aboutTitle={f["elegant.homepage.about.title"]}
          aboutText={f["elegant.homepage.about.text"]}
          aboutButtonText={f["elegant.homepage.about.button-text"]}
          aboutButtonLink={f["elegant.homepage.about.button-link"]}
          sectionAttrs={sectionGroupAttr("homepage", "about")}
          featuresVisible={isSectionVisible(
            customFields,
            "elegant",
            "homepage.features",
          )}
        />
      )}

      {isSectionVisible(customFields, "elegant", "homepage.testimonials") && (
        <ElegantTestimonials
          testimonials={testimonials}
          customFields={customFields}
          sectionAttrs={sectionGroupAttr("homepage", "testimonials")}
        />
      )}

      {isSectionVisible(customFields, "elegant", "homepage.cta") && (
        <ElegantCTABanner
          homepage={homepage}
          sectionAttrs={sectionGroupAttr("homepage", "cta")}
        />
      )}

      {isSectionVisible(customFields, "elegant", "homepage.newsletter") && (
        <ElegantNewsletter
          customFields={customFields}
          sectionAttrs={sectionGroupAttr("homepage", "newsletter")}
        />
      )}
    </>
  );
}
