import type { DefaultHomepageTemplateProps } from "../../types";
import { api, HydrateClient } from "~/trpc/server";
import { PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import { NoiseCredentialsSection } from "./noise-credentials-section";
import { NoiseEditorialStrip } from "./noise-editorial-strip";
import { NoiseFeaturedProducts } from "./noise-featured-products";
import { NoiseHeroSection } from "./noise-hero-section";
import { NoiseManifestoSection } from "./noise-manifesto-section";
import { NoiseNewsletterCta } from "./noise-newsletter-cta";
import { NoiseSignalStrip } from "./noise-signal-strip";
import { NoiseTestimonialsSection } from "./noise-testimonials-section";

export async function NoiseHomepage(_props?: DefaultHomepageTemplateProps) {
  const [homepage, testimonials] = await Promise.all([
    api.business.getHomepage(),
    api.testimonial.listRandom({ limit: 3 }),
  ]);

  const themeFields = homepage?.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  const f = resolveFields(themeFields, [
    "noise.homepage.hero-image",
    "noise.homepage.hero-overline",
    "noise.homepage.hero-title",
    "noise.homepage.hero-tagline",
    "noise.homepage.hero-primary-button-text",
    "noise.homepage.hero-primary-button-link",
    "noise.homepage.editorial-marquee-text",
    "noise.homepage-featured-title",
    "noise.homepage-featured-description",
    "noise.homepage-featured-button-text",
    "noise.homepage-featured-button-link",
    "noise.homepage-testimonials-heading",
  ]);

  const address = homepage?.businessAddress ?? undefined;

  return (
    <HydrateClient>
      <PageTransition>
        {/* 1. Hero — image-anchored 55/45 split */}
        <NoiseHeroSection
          heroImage={f["noise.homepage.hero-image"] ?? undefined}
          heroOverline={f["noise.homepage.hero-overline"] ?? undefined}
          heroTitle={f["noise.homepage.hero-title"] ?? undefined}
          heroTagline={f["noise.homepage.hero-tagline"] ?? undefined}
          heroPrimaryButtonText={f["noise.homepage.hero-primary-button-text"] ?? undefined}
          heroPrimaryButtonLink={f["noise.homepage.hero-primary-button-link"] ?? undefined}
        />

        {/* 2. Marquee strip */}
        <NoiseEditorialStrip
          marqueeText={f["noise.homepage.editorial-marquee-text"] ?? undefined}
        />

        {/* 3. Manifesto — Three rules of the studio */}
        <NoiseManifestoSection />

        {/* 4. Featured products */}
        <NoiseFeaturedProducts
          featuredProducts={homepage?.products ?? []}
          featuredTitle={f["noise.homepage-featured-title"] ?? undefined}
          featuredDescription={f["noise.homepage-featured-description"] ?? undefined}
          featuredButtonText={f["noise.homepage-featured-button-text"] ?? undefined}
          featuredButtonLink={f["noise.homepage-featured-button-link"] ?? undefined}
        />

        {/* 5. Credentials — ink bg brand story */}
        <NoiseCredentialsSection address={address} />

        {/* 6. Signal strip — press / mentions */}
        <NoiseSignalStrip />

        {/* 7. Testimonials — ink bg */}
        <NoiseTestimonialsSection
          heading={f["noise.homepage-testimonials-heading"] ?? undefined}
          testimonials={testimonials}
        />

        {/* 8. Newsletter CTA */}
        <NoiseNewsletterCta />
      </PageTransition>
    </HydrateClient>
  );
}
