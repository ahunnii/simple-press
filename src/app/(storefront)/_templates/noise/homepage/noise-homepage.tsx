import type { DefaultHomepageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { getRichTextFieldValue } from "~/lib/template-fields";
import { db } from "~/server/db";
import { api, HydrateClient } from "~/trpc/server";
import { PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import { NoiseAboutTeaser } from "./noise-about-teaser";
import { NoiseEditorialSplit } from "./noise-editorial-split";
import { NoiseGuaranteeSection } from "./noise-guarantee-section";
import { NoiseHeroSection } from "./noise-hero-section";
import { NoiseIntroWrapper } from "./noise-intro-wrapper";
import { NoiseMarqueeStrip } from "./noise-marquee-strip";
import { NoisePhilosophySection } from "./noise-philosophy-section";
import { NoiseProductRail } from "./noise-product-rail";
import { NoiseTestimonialStrip } from "./noise-testimonial-strip";

export async function NoiseHomepage(_props?: DefaultHomepageTemplateProps) {
  const [homepage, testimonials] = await Promise.all([
    api.business.getHomepage(),
    api.testimonial.listRandom({ limit: 6 }),
  ]);

  const flags = await getBusinessFlags();

  const themeFields = homepage?.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  const businessName = homepage?.name ?? "";

  const f = resolveFields(themeFields, [
    "noise.homepage.intro-gallery",
    "noise.homepage.hero-image",
    "noise.homepage.hero-video",
    "noise.homepage.hero-overline",
    "noise.homepage.hero-title",
    "noise.homepage.hero-tagline",
    "noise.homepage.hero-primary-button-text",
    "noise.homepage.hero-primary-button-link",
    "noise.homepage-featured-title",
    "noise.homepage-featured-description",
    "noise.homepage-featured-button-text",
    "noise.homepage-featured-button-link",
    "noise.homepage-testimonials-heading",
    "noise.homepage.philosophy-overline",
    "noise.homepage.philosophy-quote",
    "noise.homepage-guarantee-heading",
    "noise.homepage-guarantee-headingAccent",
    "noise.homepage-guarantee-quote",
    "noise.homepage.rail-one-collection",
    "noise.homepage.rail-one-overline",
    "noise.homepage.rail-two-collection",
    "noise.homepage.rail-two-overline",
    "noise.homepage.rail-two-title",
    "noise.global.shop-cta-text",
    "noise.global.shop-cta-link",
    "noise.global.location-tag",
    "noise.homepage-guarantee-stamp",
    "noise.homepage-guarantee-image",
    "noise.homepage.editorial-marquee-text",
    "noise.homepage-about-image",
    "noise.homepage-about-heading",
    "noise.homepage-about-button-text",
    "noise.homepage-about-button-link",
  ]);

  const aboutTeaserBody = getRichTextFieldValue(
    themeFields,
    "noise.homepage-about-body",
  );

  const products = homepage?.products ?? [];

  const introGalleryId = f["noise.homepage.intro-gallery"];
  const introGallery = introGalleryId
    ? await db.gallery.findUnique({
        where: { id: introGalleryId },
        include: { images: { orderBy: { sortOrder: "asc" } } },
      })
    : null;
  const introImages =
    introGallery?.images.map((img) => ({
      url: img.url,
      altText: img.altText,
    })) ?? [];

  const rail1CollectionId = f["noise.homepage.rail-one-collection"] ?? "";
  const rail2CollectionId = f["noise.homepage.rail-two-collection"] ?? "";

  const [rail1Data, rail2Data] = await Promise.all([
    rail1CollectionId
      ? api.collections.getProductsByCollectionId(rail1CollectionId)
      : Promise.resolve(null),
    rail2CollectionId
      ? api.collections.getProductsByCollectionId(rail2CollectionId)
      : Promise.resolve(null),
  ]);

  const railOneProducts = rail1Data?.products ?? products.slice(0, 4);
  const railTwoProducts = rail2Data?.products ?? products.slice(4, 8);

  const railOneCtaHref = rail1Data
    ? `/collections/${rail1Data.collection.slug}`
    : (f["noise.homepage-featured-button-link"] ?? "/shop");
  const railTwoCtaHref = rail2Data
    ? `/collections/${rail2Data.collection.slug}`
    : "/shop";

  return (
    <HydrateClient>
      <NoiseIntroWrapper
        introImages={introImages}
        wordmark={businessName.length > 0 ? businessName : undefined}
        locationTag={f["noise.global.location-tag"] ?? undefined}
      >
        <PageTransition>
          {/* 1. Hero */}
          <NoiseHeroSection
            heroVideo={f["noise.homepage.hero-video"] ?? undefined}
            heroImage={f["noise.homepage.hero-image"] ?? undefined}
            heroOverline={
              (f["noise.homepage.hero-overline"] ?? "").length > 0
                ? f["noise.homepage.hero-overline"]
                : undefined
            }
            heroTitle={f["noise.homepage.hero-title"] ?? undefined}
            heroTagline={f["noise.homepage.hero-tagline"] ?? undefined}
            heroPrimaryButtonText={
              f["noise.homepage.hero-primary-button-text"] ?? undefined
            }
            heroPrimaryButtonLink={
              f["noise.homepage.hero-primary-button-link"] ?? undefined
            }
            wordmark={businessName.length > 0 ? businessName : undefined}
            locationTag={
              (f["noise.global.location-tag"] ?? "").length > 0
                ? f["noise.global.location-tag"]
                : undefined
            }
            sectionAttrs={sectionGroupAttr("homepage", "hero")}
          />

          {/* 2. Scrolling marquee band beneath the hero */}
          {isSectionVisible(themeFields, "noise", "homepage.editorial") && (
            <NoiseMarqueeStrip
              text={f["noise.homepage.editorial-marquee-text"]}
              sectionAttrs={sectionGroupAttr("homepage", "editorial")}
            />
          )}

          {/* 3. Philosophy */}
          <NoisePhilosophySection
            overline={f["noise.homepage.philosophy-overline"]}
            quote={f["noise.homepage.philosophy-quote"]}
            sectionAttrs={sectionGroupAttr("homepage", "philosophy")}
          />

          {/* 4. Brand story teaser */}
          {isSectionVisible(themeFields, "noise", "homepage.aboutTeaser") && (
            <NoiseAboutTeaser
              heading={f["noise.homepage-about-heading"] ?? undefined}
              body={aboutTeaserBody as TiptapJSON | null}
              image={f["noise.homepage-about-image"] ?? undefined}
              buttonText={f["noise.homepage-about-button-text"] ?? undefined}
              buttonLink={f["noise.homepage-about-button-link"] ?? undefined}
              sectionAttrs={sectionGroupAttr("homepage", "aboutTeaser")}
            />
          )}

          {/* 5. First product rail */}
          {railOneProducts.length > 0 && (
            <NoiseProductRail
              overline={f["noise.homepage.rail-one-overline"] ?? "Collection"}
              overlineFieldKey="noise.homepage.rail-one-overline"
              title={
                rail1Data?.collection.name ??
                f["noise.homepage-featured-title"] ??
                "The Collection"
              }
              description={
                rail1Data?.collection.description ??
                f["noise.homepage-featured-description"] ??
                undefined
              }
              ctaText={f["noise.homepage-featured-button-text"] ?? "Shop All"}
              ctaTextFieldKey="noise.homepage-featured-button-text"
              ctaHref={railOneCtaHref}
              products={railOneProducts}
              sectionAttrs={sectionGroupAttr("homepage", "featured")}
            />
          )}

          {/* 6. Editorial split — links to the journal */}
          {flags.isEnabled("blog") && <NoiseEditorialSplit />}

          {/* 7. Second product rail (when 5+ featured products or a collection is configured) */}
          {railTwoProducts.length > 0 && (
            <NoiseProductRail
              overline={f["noise.homepage.rail-two-overline"] ?? "New Arrivals"}
              overlineFieldKey="noise.homepage.rail-two-overline"
              title={
                rail2Data?.collection.name ??
                f["noise.homepage.rail-two-title"] ??
                "New Arrivals"
              }
              description={rail2Data?.collection.description ?? undefined}
              ctaText={f["noise.global.shop-cta-text"] ?? "Shop All"}
              ctaTextFieldKey="noise.global.shop-cta-text"
              ctaHref={railTwoCtaHref}
              products={railTwoProducts}
              sectionAttrs={sectionGroupAttr("homepage", "featured")}
            />
          )}

          {/* 8. Guarantee */}
          <NoiseGuaranteeSection
            heading={f["noise.homepage-guarantee-heading"]}
            headingAccent={f["noise.homepage-guarantee-headingAccent"]}
            body={f["noise.homepage-guarantee-quote"]}
            stamp={f["noise.homepage-guarantee-stamp"] ?? undefined}
            image={f["noise.homepage-guarantee-image"] ?? undefined}
            sectionAttrs={sectionGroupAttr("homepage", "guarantee")}
          />

          {/* 9. Rotating testimonial strip */}
          {flags.isEnabled("testimonials") &&
            isSectionVisible(themeFields, "noise", "homepage.testimonials") && (
              <NoiseTestimonialStrip
                testimonials={testimonials}
                heading={f["noise.homepage-testimonials-heading"] ?? undefined}
                sectionAttrs={sectionGroupAttr("homepage", "testimonials")}
              />
            )}
        </PageTransition>
      </NoiseIntroWrapper>
    </HydrateClient>
  );
}
