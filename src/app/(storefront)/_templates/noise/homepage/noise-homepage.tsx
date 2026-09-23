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
import { NoiseCollectionShowcase } from "./noise-collection-showcase";
import { NoiseEditorialSplit } from "./noise-editorial-split";
import { NoiseGuaranteeSection } from "./noise-guarantee-section";
import { NoiseHeroSection } from "./noise-hero-section";
import { NoiseIntroWrapper } from "./noise-intro-wrapper";
import { NoiseMarqueeStrip } from "./noise-marquee-strip";
import { NoisePhilosophySection } from "./noise-philosophy-section";
import { NoiseProductRail } from "./noise-product-rail";
import { NoiseTestimonialStrip } from "./noise-testimonial-strip";

type NoiseCollections = Awaited<
  ReturnType<typeof api.collections.getAllPublic>
>;
type NoiseRailProducts = Awaited<
  ReturnType<typeof api.product.getRailProducts>
>;

/**
 * Mirrors `business.getHomepage`'s coming-soon exclusion (it filters on
 * `additionalFields.comingSoon` stored as either `false` or `"false"`).
 * `getRailProducts` doesn't filter, so drop anything flagged true here —
 * a product with no flag at all is treated as live.
 */
function isComingSoon(additionalFields: unknown): boolean {
  if (
    additionalFields == null ||
    typeof additionalFields !== "object" ||
    Array.isArray(additionalFields)
  ) {
    return false;
  }
  const flag = (additionalFields as Record<string, unknown>).comingSoon;
  return flag === true || flag === "true";
}

/** Owner-set showcase size, clamped to 2–6; falls back to 3 when unparseable. */
function parseCollectionsCount(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (Number.isNaN(n)) return 3;
  return Math.min(6, Math.max(2, n));
}

export async function NoiseHomepage(_props?: DefaultHomepageTemplateProps) {
  const [homepage, flags] = await Promise.all([
    api.business.getHomepage(),
    getBusinessFlags(),
  ]);

  // `listRandom` is behind `featureGate("testimonials")` and FORBIDs when the
  // flag is off — fetched eagerly it 500s the whole homepage for a store that
  // merely disabled testimonials. The strip's render below is already gated on
  // the same flag, so the fetch must be too (same shape as every other
  // template's homepage).
  const testimonials = flags.isEnabled("testimonials")
    ? await api.testimonial.listRandom({ limit: 6 })
    : [];

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
    "noise.homepage.rail-one-overline",
    "noise.homepage.collections-count",
    "noise.homepage.rail-two-overline",
    "noise.homepage.rail-two-title",
    "noise.homepage.latest-button-text",
    "noise.homepage.latest-button-link",
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

  // Both fetches are feature-gated server-side (FORBIDDEN when the flag is
  // off), so gate them here too and swallow any other failure — a broken
  // rail must never 500 the whole homepage.
  const [allCollections, railProducts] = await Promise.all([
    flags.isEnabled("collections")
      ? api.collections.getAllPublic().catch(() => [] as NoiseCollections)
      : Promise.resolve([] as NoiseCollections),
    flags.isEnabled("products")
      ? api.product
          .getRailProducts({ limit: 4 })
          .catch(() => [] as NoiseRailProducts)
      : Promise.resolve([] as NoiseRailProducts),
  ]);

  // Admin sort order; skip empty collections so a card never leads to an
  // empty page.
  const showcaseCollections = allCollections
    .filter((c) => c._count.collectionProducts > 0)
    .slice(0, parseCollectionsCount(f["noise.homepage.collections-count"]));

  // Newest first (getRailProducts orders by createdAt desc).
  const latestProducts = railProducts.filter(
    (p) => !isComingSoon(p.additionalFields),
  );

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

          {/* 5. Collections showcase */}
          <NoiseCollectionShowcase
            overline={
              (f["noise.homepage.rail-one-overline"] ?? "").trim() || undefined
            }
            title={
              (f["noise.homepage-featured-title"] ?? "").trim() ||
              "The Collections"
            }
            description={
              (f["noise.homepage-featured-description"] ?? "").trim() ||
              undefined
            }
            ctaText={
              (f["noise.homepage-featured-button-text"] ?? "").trim() ||
              "View All Collections"
            }
            ctaHref={
              (f["noise.homepage-featured-button-link"] ?? "").trim() ||
              "/collections"
            }
            collections={showcaseCollections}
            sectionAttrs={sectionGroupAttr("homepage", "collections")}
          />

          {/* 6. Editorial split — links to the journal */}
          {flags.isEnabled("blog") && <NoiseEditorialSplit />}

          {/* 7. Latest arrivals — hidden when nothing is live */}
          {latestProducts.length > 0 && (
            <NoiseProductRail
              overline={
                (f["noise.homepage.rail-two-overline"] ?? "").trim() ||
                undefined
              }
              overlineFieldKey="noise.homepage.rail-two-overline"
              title={
                (f["noise.homepage.rail-two-title"] ?? "").trim() ||
                "Latest Arrivals"
              }
              titleFieldKey="noise.homepage.rail-two-title"
              ctaText={
                (f["noise.homepage.latest-button-text"] ?? "").trim() ||
                "Shop All"
              }
              ctaTextFieldKey="noise.homepage.latest-button-text"
              ctaHref={
                (f["noise.homepage.latest-button-link"] ?? "").trim() || "/shop"
              }
              products={latestProducts}
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
