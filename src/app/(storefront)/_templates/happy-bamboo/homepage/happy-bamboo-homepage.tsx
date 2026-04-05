import { getRichTextFieldValue } from "~/lib/template-fields";
import { api, HydrateClient } from "~/trpc/server";
import { PageTransition } from "~/components/page-animations";

import { HappyBambooAboutSection } from "./happy-bamboo-about-section";
import { HappyBambooBenefitsSection } from "./happy-bamboo-benefits-section";
import { HappyBambooCtaSection } from "./happy-bamboo-cta-section";
import { HappyBambooFeaturedProducts } from "./happy-bamboo-featured-products";
import { HappyBambooHeroSection } from "./happy-bamboo-hero-section";
import { HappyBambooTestimonialsSection } from "./happy-bamboo-testimonials-section";

export async function HappyBambooHomepage() {
  const [homepage, testimonials] = await Promise.all([
    api.business.getHomepage(),
    api.testimonial.listRandom({ limit: 3 }),
  ]);

  const themeSpecificFields = homepage?.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  const missionRichContent = getRichTextFieldValue(
    themeSpecificFields as unknown,
    "happy-bamboo.homepage-about-body",
  );

  return (
    <HydrateClient>
      <PageTransition>
        {/* Hero Section */}
        <HappyBambooHeroSection
          heroImage={themeSpecificFields?.[
            "happy-bamboo.homepage.hero-image"
          ]?.trim()}
          heroWelcome={themeSpecificFields?.[
            "happy-bamboo.homepage.hero-welcome"
          ]?.trim()}
          heroTitle={themeSpecificFields?.[
            "happy-bamboo.homepage.hero-title"
          ]?.trim()}
          heroTagline={themeSpecificFields?.[
            "happy-bamboo.homepage.hero-tagline"
          ]?.trim()}
          heroDescription={themeSpecificFields?.[
            "happy-bamboo.homepage.hero-description"
          ]?.trim()}
          heroPrimaryButtonText={themeSpecificFields?.[
            "happy-bamboo.homepage.hero-primary-button-text"
          ]?.trim()}
          heroPrimaryButtonLink={themeSpecificFields?.[
            "happy-bamboo.homepage.hero-primary-button-link"
          ]?.trim()}
        />

        <HappyBambooAboutSection
          aboutVideoUrl={themeSpecificFields?.[
            "happy-bamboo.homepage-about-video"
          ]?.trim()}
          aboutVideoPosterUrl={themeSpecificFields?.[
            "happy-bamboo.homepage-about-video-poster"
          ]?.trim()}
          aboutHeading={themeSpecificFields?.[
            "happy-bamboo.homepage-about-heading"
          ]?.trim()}
          aboutDescription={missionRichContent}
          aboutButtonText={themeSpecificFields?.[
            "happy-bamboo.homepage-about-button-text"
          ]?.trim()}
          aboutButtonLink={themeSpecificFields?.[
            "happy-bamboo.homepage-about-button-link"
          ]?.trim()}
        />

        {/* Featured Products */}
        <HappyBambooFeaturedProducts
          featuredProducts={homepage?.products ?? []}
          featuredTitle={themeSpecificFields?.[
            "happy-bamboo.homepage-featured-title"
          ]?.trim()}
          featuredDescription={themeSpecificFields?.[
            "happy-bamboo.homepage-featured-description"
          ]?.trim()}
          featuredButtonText={themeSpecificFields?.[
            "happy-bamboo.homepage-featured-button-text"
          ]?.trim()}
          featuredButtonLink={themeSpecificFields?.[
            "happy-bamboo.homepage-featured-button-link"
          ]?.trim()}
        />

        <HappyBambooBenefitsSection
          themeSpecificFieldsRaw={themeSpecificFields}
          heading={themeSpecificFields?.[
            "happy-bamboo.homepage-benefits-heading"
          ]?.trim()}
          intro={themeSpecificFields?.[
            "happy-bamboo.homepage-benefits-intro"
          ]?.trim()}
          closing={themeSpecificFields?.[
            "happy-bamboo.homepage-benefits-closing"
          ]?.trim()}
        />
        <HappyBambooTestimonialsSection
          heading={themeSpecificFields?.[
            "happy-bamboo.homepage-testimonials-heading"
          ]?.trim()}
          testimonials={testimonials}
        />
        {/* <HappyBambooCtaSection
          heading={themeSpecificFields?.[
            "happy-bamboo.homepage-cta-heading"
          ]?.trim()}
          body={themeSpecificFields?.["happy-bamboo.homepage-cta-body"]?.trim()}
          primaryButtonText={themeSpecificFields?.[
            "happy-bamboo.homepage-cta-primary-button-text"
          ]?.trim()}
          primaryButtonLink={themeSpecificFields?.[
            "happy-bamboo.homepage-cta-primary-button-link"
          ]?.trim()}
          secondaryButtonText={themeSpecificFields?.[
            "happy-bamboo.homepage-cta-secondary-button-text"
          ]?.trim()}
          secondaryButtonLink={themeSpecificFields?.[
            "happy-bamboo.homepage-cta-secondary-button-link"
          ]?.trim()}
        /> */}
      </PageTransition>
    </HydrateClient>
  );
}
