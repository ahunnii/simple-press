import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { isPreviewRequest } from "~/lib/preview/preview-context";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { getRichTextFieldValue } from "~/lib/template-fields";
import { api, HydrateClient } from "~/trpc/server";
import { PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import { HappyBambooAboutSection } from "./happy-bamboo-about-section";
import { HappyBambooBenefitsSection } from "./happy-bamboo-benefits-section";
import { HappyBambooCtaSection } from "./happy-bamboo-cta-section";
import { HappyBambooFeaturedProducts } from "./happy-bamboo-featured-products";
import { HappyBambooHeroSection } from "./happy-bamboo-hero-section";
import { HappyBambooTestimonialsSection } from "./happy-bamboo-testimonials-section";

export async function HappyBambooHomepage() {
  const [homepage, flags] = await Promise.all([
    api.business.getHomepage(),
    getBusinessFlags(),
  ]);

  const testimonialsEnabled = flags.isEnabled("testimonials");
  const testimonials = testimonialsEnabled
    ? await api.testimonial.listRandom({ limit: 3 })
    : [];

  const themeSpecificFields = homepage?.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  const missionRichContent = getRichTextFieldValue(
    themeSpecificFields as unknown,
    "happy-bamboo.homepage-about-body",
  );

  const f = resolveFields(homepage?.siteContent?.customFields, [
    "happy-bamboo.sale-badge-format",
    "happy-bamboo.homepage.hero-image",
    "happy-bamboo.homepage.hero-welcome",
    "happy-bamboo.homepage.hero-title",
    "happy-bamboo.homepage.hero-tagline",
    "happy-bamboo.homepage.hero-description",
    "happy-bamboo.homepage.hero-primary-button-text",
    "happy-bamboo.homepage.hero-primary-button-link",
    "happy-bamboo.homepage-about-small-label",
    "happy-bamboo.homepage-about-video",
    "happy-bamboo.homepage-about-video-poster",
    "happy-bamboo.homepage-about-image",
    "happy-bamboo.homepage-about-heading",
    "happy-bamboo.homepage-about-button-text",
    "happy-bamboo.homepage-about-button-link",
    "happy-bamboo.homepage-featured-small-label",
    "happy-bamboo.homepage-featured-title",
    "happy-bamboo.homepage-featured-description",
    "happy-bamboo.homepage-featured-button-text",
    "happy-bamboo.homepage-featured-button-link",
    "happy-bamboo.homepage-benefits-small-label",
    "happy-bamboo.homepage-benefits-heading",
    "happy-bamboo.homepage-benefits-intro",
    "happy-bamboo.homepage-benefits-closing",
    "happy-bamboo.homepage-testimonials-heading",
    "happy-bamboo.homepage-cta-heading",
    "happy-bamboo.homepage-cta-body",
    "happy-bamboo.homepage-cta-primary-button-text",
    "happy-bamboo.homepage-cta-primary-button-link",
    "happy-bamboo.homepage-cta-secondary-button-text",
    "happy-bamboo.homepage-cta-secondary-button-link",
  ]);

  const customFields = homepage?.siteContent?.customFields;
  const hasAboutTeaser = isSectionVisible(
    customFields,
    "happy-bamboo",
    "homepage.aboutTeaser",
  );

  // Featured also hides itself on the live storefront when the store has no
  // products (a public "No products found" placeholder reads as broken, not
  // "coming soon") — but stays rendered inside the editor preview so an
  // owner setting up a fresh store still has the section's hover/click
  // hotspot to find. See `happy-bamboo-featured-products.tsx`'s own empty
  // state.
  const isPreview = await isPreviewRequest();
  const hasProducts = (homepage?.products?.length ?? 0) > 0;
  const hasFeatured =
    isSectionVisible(customFields, "happy-bamboo", "homepage.featured") &&
    (hasProducts || isPreview);

  return (
    <HydrateClient>
      <PageTransition>
        {/* Hero Section */}
        <HappyBambooHeroSection
          heroImage={f["happy-bamboo.homepage.hero-image"]}
          heroWelcome={f["happy-bamboo.homepage.hero-welcome"] ?? ""}
          heroTitle={f["happy-bamboo.homepage.hero-title"] ?? ""}
          heroTagline={f["happy-bamboo.homepage.hero-tagline"]}
          heroDescription={f["happy-bamboo.homepage.hero-description"] ?? ""}
          heroPrimaryButtonText={
            f["happy-bamboo.homepage.hero-primary-button-text"] ?? ""
          }
          heroPrimaryButtonLink={
            f["happy-bamboo.homepage.hero-primary-button-link"] ?? ""
          }
          sectionAttrs={sectionGroupAttr("homepage", "hero")}
        />

        {hasAboutTeaser && (
          <HappyBambooAboutSection
            aboutSmallLabel={f["happy-bamboo.homepage-about-small-label"]}
            aboutVideoUrl={f["happy-bamboo.homepage-about-video"]}
            aboutVideoPosterUrl={f["happy-bamboo.homepage-about-video-poster"]}
            aboutHeading={f["happy-bamboo.homepage-about-heading"]}
            aboutDescription={missionRichContent}
            aboutButtonText={f["happy-bamboo.homepage-about-button-text"]}
            aboutButtonLink={f["happy-bamboo.homepage-about-button-link"]}
            aboutImageUrl={f["happy-bamboo.homepage-about-image"]}
            sectionAttrs={sectionGroupAttr("homepage", "aboutTeaser")}
          />
        )}

        {/* Featured Products */}
        {hasFeatured && (
          <HappyBambooFeaturedProducts
            featuredProducts={homepage?.products ?? []}
            featuredSmallLabel={f["happy-bamboo.homepage-featured-small-label"]}
            featuredTitle={f["happy-bamboo.homepage-featured-title"] ?? ""}
            featuredDescription={
              f["happy-bamboo.homepage-featured-description"] ?? ""
            }
            featuredButtonText={
              f["happy-bamboo.homepage-featured-button-text"] ?? ""
            }
            featuredButtonLink={
              f["happy-bamboo.homepage-featured-button-link"] ?? ""
            }
            saleBadgeFormat={f["happy-bamboo.sale-badge-format"]}
            isPreview={isPreview}
            sectionAttrs={sectionGroupAttr("homepage", "featured")}
          />
        )}

        {isSectionVisible(
          homepage?.siteContent?.customFields,
          "happy-bamboo",
          "homepage.benefits",
        ) && (
          <HappyBambooBenefitsSection
            themeSpecificFieldsRaw={themeSpecificFields}
            smallLabel={f["happy-bamboo.homepage-benefits-small-label"]}
            heading={f["happy-bamboo.homepage-benefits-heading"] ?? ""}
            intro={f["happy-bamboo.homepage-benefits-intro"]}
            closing={f["happy-bamboo.homepage-benefits-closing"]}
            sectionAttrs={sectionGroupAttr("homepage", "benefits")}
          />
        )}
        {testimonialsEnabled &&
          isSectionVisible(
            homepage?.siteContent?.customFields,
            "happy-bamboo",
            "homepage.testimonials",
          ) && (
            <HappyBambooTestimonialsSection
              heading={f["happy-bamboo.homepage-testimonials-heading"] ?? ""}
              testimonials={testimonials}
              sectionAttrs={sectionGroupAttr("homepage", "testimonials")}
            />
          )}
        {isSectionVisible(
          homepage?.siteContent?.customFields,
          "happy-bamboo",
          "homepage.cta",
        ) && (
          <HappyBambooCtaSection
            heading={f["happy-bamboo.homepage-cta-heading"] ?? ""}
            body={f["happy-bamboo.homepage-cta-body"] ?? ""}
            primaryButtonText={
              f["happy-bamboo.homepage-cta-primary-button-text"] ?? ""
            }
            primaryButtonLink={
              f["happy-bamboo.homepage-cta-primary-button-link"] ?? ""
            }
            secondaryButtonText={
              f["happy-bamboo.homepage-cta-secondary-button-text"] ?? ""
            }
            secondaryButtonLink={
              f["happy-bamboo.homepage-cta-secondary-button-link"] ?? ""
            }
            sectionAttrs={sectionGroupAttr("homepage", "cta")}
          />
        )}
      </PageTransition>
    </HydrateClient>
  );
}
