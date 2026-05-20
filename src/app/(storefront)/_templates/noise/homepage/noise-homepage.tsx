import type { DefaultHomepageTemplateProps } from "../../types";
import { api, HydrateClient } from "~/trpc/server";
import { PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import { NoiseEditorialSplit } from "./noise-editorial-split";
import { NoiseGuaranteeSection } from "./noise-guarantee-section";
import { NoiseHeroSection } from "./noise-hero-section";
import { NoiseIntroWrapper } from "./noise-intro-wrapper";
import { NoisePhilosophySection } from "./noise-philosophy-section";
import { NoiseProductRail } from "./noise-product-rail";
import { NoiseTestimonialStrip } from "./noise-testimonial-strip";

export async function NoiseHomepage(_props?: DefaultHomepageTemplateProps) {
  const [homepage, testimonials] = await Promise.all([
    api.business.getHomepage(),
    api.testimonial.listRandom({ limit: 6 }),
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
    "noise.homepage-featured-title",
    "noise.homepage-featured-button-text",
    "noise.homepage-featured-button-link",
    "noise.homepage-testimonials-heading",
    "noise.homepage.philosophy-overline",
    "noise.homepage.philosophy-quote",
    "noise.homepage-guarantee-title",
    "noise.homepage-guarantee-quote",
  ]);

  const products = homepage?.products ?? [];
  const railOne = products.slice(0, 4);
  const railTwo = products.slice(4, 8);

  return (
    <HydrateClient>
      <NoiseIntroWrapper>
        <PageTransition>
          {/* 1. Hero */}
          <NoiseHeroSection
            heroImage={f["noise.homepage.hero-image"] ?? undefined}
            heroOverline={f["noise.homepage.hero-overline"] ?? undefined}
            heroTitle={f["noise.homepage.hero-title"] ?? undefined}
            heroTagline={f["noise.homepage.hero-tagline"] ?? undefined}
            heroPrimaryButtonText={
              f["noise.homepage.hero-primary-button-text"] ?? undefined
            }
            heroPrimaryButtonLink={
              f["noise.homepage.hero-primary-button-link"] ?? undefined
            }
          />

          {/* 2. Philosophy */}
          <NoisePhilosophySection
            overline={f["noise.homepage.philosophy-overline"]}
            quote={f["noise.homepage.philosophy-quote"]}
          />

          {/* 3. First product rail */}
          {railOne.length > 0 && (
            <NoiseProductRail
              overline="Collection"
              title={f["noise.homepage-featured-title"] ?? "The Collection"}
              ctaText={f["noise.homepage-featured-button-text"] ?? "View All"}
              ctaHref={f["noise.homepage-featured-button-link"] ?? "/shop"}
              products={railOne}
            />
          )}

          {/* 4. Editorial split — links to the journal */}
          <NoiseEditorialSplit />

          {/* 5. Second product rail (when 5+ featured products configured) */}
          {railTwo.length > 0 && (
            <NoiseProductRail
              overline="New Arrivals"
              title="Fresh from the Studio"
              ctaText="Shop New"
              ctaHref="/shop"
              products={railTwo}
            />
          )}

          {/* 6. Guarantee */}
          <NoiseGuaranteeSection
            heading={f["noise.homepage-guarantee-heading"]}
            headingAccent={f["noise.homepage-guarantee-headingAccent"]}
            body={f["noise.homepage-guarantee-quote"]}
          />

          {/* 7. Rotating testimonial strip */}
          <NoiseTestimonialStrip
            testimonials={testimonials}
            heading={f["noise.homepage-testimonials-heading"] ?? undefined}
          />
        </PageTransition>
      </NoiseIntroWrapper>
    </HydrateClient>
  );
}
