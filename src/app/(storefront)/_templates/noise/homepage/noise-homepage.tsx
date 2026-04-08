import type { DefaultHomepageTemplateProps } from "../../types";
import { getRichTextFieldValue } from "~/lib/template-fields";
import { api, HydrateClient } from "~/trpc/server";
import { PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import { NoiseAboutTeaser } from "./noise-about-teaser";
import { NoiseEditorialStrip } from "./noise-editorial-strip";
import { NoiseFeaturedProducts } from "./noise-featured-products";
import { NoiseHeroSection } from "./noise-hero-section";
import { NoiseTestimonialsSection } from "./noise-testimonials-section";

export async function NoiseHomepage(_props?: DefaultHomepageTemplateProps) {
  const [homepage, testimonials] = await Promise.all([
    api.business.getHomepage(),
    api.testimonial.listRandom({ limit: 3 }),
  ]);

  const themeFields = homepage?.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  const aboutBodyContent = getRichTextFieldValue(
    themeFields as unknown,
    "noise.homepage-about-body",
  );

  const f = resolveFields(themeFields, [
    "noise.homepage.hero-image",
    "noise.homepage.hero-overline",
    "noise.homepage.hero-title",
    "noise.homepage.hero-tagline",
    "noise.homepage.hero-primary-button-text",
    "noise.homepage.hero-primary-button-link",
    "noise.homepage.editorial-marquee-text",
    "noise.homepage-about-image",
    "noise.homepage-about-heading",
    "noise.homepage-about-button-text",
    "noise.homepage-about-button-link",
    "noise.homepage-featured-title",
    "noise.homepage-featured-description",
    "noise.homepage-featured-button-text",
    "noise.homepage-featured-button-link",
    "noise.homepage-testimonials-heading",
  ]);

  return (
    <HydrateClient>
      <PageTransition>
        <NoiseHeroSection
          heroImage={f["noise.homepage.hero-image"] ?? undefined}
          heroOverline={f["noise.homepage.hero-overline"] ?? undefined}
          heroTitle={f["noise.homepage.hero-title"] ?? undefined}
          heroTagline={f["noise.homepage.hero-tagline"] ?? undefined}
          heroPrimaryButtonText={f["noise.homepage.hero-primary-button-text"] ?? undefined}
          heroPrimaryButtonLink={f["noise.homepage.hero-primary-button-link"] ?? undefined}
        />

        <NoiseEditorialStrip
          marqueeText={f["noise.homepage.editorial-marquee-text"] ?? undefined}
        />

        <NoiseAboutTeaser
          imageUrl={f["noise.homepage-about-image"] ?? undefined}
          heading={f["noise.homepage-about-heading"] ?? undefined}
          bodyContent={aboutBodyContent}
          buttonText={f["noise.homepage-about-button-text"] ?? undefined}
          buttonLink={f["noise.homepage-about-button-link"] ?? undefined}
        />

        <NoiseFeaturedProducts
          featuredProducts={homepage?.products ?? []}
          featuredTitle={f["noise.homepage-featured-title"] ?? undefined}
          featuredDescription={f["noise.homepage-featured-description"] ?? undefined}
          featuredButtonText={f["noise.homepage-featured-button-text"] ?? undefined}
          featuredButtonLink={f["noise.homepage-featured-button-link"] ?? undefined}
        />

        <NoiseTestimonialsSection
          heading={f["noise.homepage-testimonials-heading"] ?? undefined}
          testimonials={testimonials}
        />
      </PageTransition>
    </HydrateClient>
  );
}
