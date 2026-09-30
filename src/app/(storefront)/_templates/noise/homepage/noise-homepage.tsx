import type { DefaultHomepageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import { navHrefFlag } from "~/app/(storefront)/_components/nav/nav-flags";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { isPreviewRequest } from "~/lib/preview/preview-context";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { resolvePopup } from "~/lib/site-banner/resolve";
import { isSectionVisible } from "~/lib/sp-meta";
import { getRichTextFieldValue } from "~/lib/template-fields";
import { db } from "~/server/db";
import { api, HydrateClient } from "~/trpc/server";
import { PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import { resolveNoiseLocationTag } from "../shared/noise-location-tag";
import { noiseMonogram } from "../shared/noise-monogram";
import { nonBlank } from "../shared/noise-non-blank";
import { NoiseAboutTeaser } from "./noise-about-teaser";
import { NoiseCollectionShowcase } from "./noise-collection-showcase";
import { NoiseEditorialSplit } from "./noise-editorial-split";
import { NoiseGuaranteeSection } from "./noise-guarantee-section";
import { NoiseHeroSection } from "./noise-hero-section";
import { NoiseIntroWrapper } from "./noise-intro-wrapper";
import { NoiseMarqueeStrip } from "./noise-marquee-strip";
import { NoisePhilosophySection } from "./noise-philosophy-section";
import { NoisePopup } from "./noise-popup";
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

export async function NoiseHomepage(props?: DefaultHomepageTemplateProps) {
  const [homepage, flags] = await Promise.all([
    api.business.getHomepage(),
    getBusinessFlags(),
  ]);

  // B2.4: the owner's popup. `getHomepage` doesn't select `popupConfig` (it's
  // not needed for the fields/products it returns), so this reads from the
  // richer `business` prop instead — same source olive/vii use.
  const popup = resolvePopup(props?.business?.siteContent, flags.isEnabled("popups"));

  // B2.5: hide a field-driven CTA/link when its route's flag is off — never
  // swap in another destination. A section may already require its own flag
  // to render at all; this only bites when the owner points a link at a
  // *different*, flag-gated route (e.g. a "/shop" button on a section that
  // isn't itself gated on "products"). `resolveFields` already applies each
  // key's own default (e.g. "/shop") when the field is unset, so `f[key]`
  // alone — never `?? "/shop"` — is the resolved href; a blank href (the
  // owner cleared the field) stays blank rather than being overridden.
  const ctaFlagOk = (href: string): boolean => {
    const flag = navHrefFlag(href);
    return flag === null || flags.isEnabled(flag);
  };

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
  const monogram = noiseMonogram(businessName);
  const locationTag = resolveNoiseLocationTag(props?.business, themeFields);

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
    "noise.homepage-guarantee-overline",
    "noise.homepage-guarantee-heading",
    "noise.homepage-guarantee-headingAccent",
    "noise.homepage-guarantee-quote",
    "noise.homepage.rail-one-overline",
    "noise.homepage.collections-count",
    "noise.homepage.rail-two-overline",
    "noise.homepage.rail-two-title",
    "noise.homepage.latest-button-text",
    "noise.homepage.latest-button-link",
    "noise.homepage-guarantee-stamp",
    "noise.homepage-guarantee-image",
    "noise.homepage.editorial-marquee-text",
    "noise.homepage-about-overline",
    "noise.homepage-about-image",
    "noise.homepage-about-heading",
    "noise.homepage-about-button-text",
    "noise.homepage-about-button-link",
    "noise.homepage.blog-teaser-overline",
    "noise.homepage.blog-teaser-heading",
    "noise.homepage.blog-teaser-body",
    "noise.homepage.blog-teaser-button-text",
    "noise.homepage.blog-teaser-button-link",
    "noise.homepage.blog-teaser-image",
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

  // The showcase and latest-arrivals rail hide themselves on the live
  // storefront when they have nothing to show, but stay rendered (with a
  // placeholder note) inside the editor preview so an owner setting up a
  // fresh store still has the section's hotspot to click (bamboo pattern).
  const isPreview = await isPreviewRequest();
  const visible = (sectionId: string) =>
    isSectionVisible(themeFields, "noise", sectionId);

  // ── Field-driven CTA/link hrefs (B2.5) ────────────────────────────────────
  // Each key below has a matching `defaultValue` in `homepage/index.tsx`, so
  // `resolveFields` already applies it for an unset field — no `?? "/shop"`
  // fallback here. A blanked field stays blank (the CTA hides) rather than
  // being overridden back to the old default.
  const heroCtaRaw = f["noise.homepage.hero-primary-button-link"] ?? "";
  const heroCtaHref = ctaFlagOk(heroCtaRaw) ? heroCtaRaw : "";

  const aboutCtaRaw = f["noise.homepage-about-button-link"] ?? "";
  const aboutCtaHref = ctaFlagOk(aboutCtaRaw) ? aboutCtaRaw : "";

  const collectionsCtaRaw = f["noise.homepage-featured-button-link"] ?? "";
  const collectionsCtaHref = ctaFlagOk(collectionsCtaRaw)
    ? collectionsCtaRaw
    : "";

  const blogTeaserCtaRaw = f["noise.homepage.blog-teaser-button-link"] ?? "";
  const blogTeaserCtaHref = ctaFlagOk(blogTeaserCtaRaw)
    ? blogTeaserCtaRaw
    : "";

  const latestCtaRaw = f["noise.homepage.latest-button-link"] ?? "";
  const latestCtaHref = ctaFlagOk(latestCtaRaw) ? latestCtaRaw : "";

  return (
    <HydrateClient>
      {popup ? <NoisePopup popup={popup} /> : null}

      <NoiseIntroWrapper
        introImages={introImages}
        wordmark={businessName.length > 0 ? businessName : undefined}
        locationTag={locationTag}
      >
        <PageTransition>
          {/* 1. Hero */}
          <NoiseHeroSection
            heroVideo={f["noise.homepage.hero-video"] ?? ""}
            heroImage={f["noise.homepage.hero-image"] ?? ""}
            heroOverline={nonBlank(f["noise.homepage.hero-overline"])}
            heroTitle={f["noise.homepage.hero-title"] ?? ""}
            heroTagline={f["noise.homepage.hero-tagline"] ?? ""}
            heroPrimaryButtonText={
              f["noise.homepage.hero-primary-button-text"] ?? ""
            }
            heroPrimaryButtonLink={heroCtaHref}
            wordmark={businessName.length > 0 ? businessName : undefined}
            locationTag={locationTag}
            monogram={monogram}
            sectionAttrs={sectionGroupAttr("homepage", "hero")}
          />

          {/* 2. Scrolling marquee band beneath the hero */}
          {visible("homepage.editorial") && (
            <NoiseMarqueeStrip
              text={f["noise.homepage.editorial-marquee-text"]}
              sectionAttrs={sectionGroupAttr("homepage", "editorial")}
            />
          )}

          {/* 3. Philosophy */}
          {visible("homepage.philosophy") && (
            <NoisePhilosophySection
              overline={f["noise.homepage.philosophy-overline"]}
              quote={f["noise.homepage.philosophy-quote"]}
              sectionAttrs={sectionGroupAttr("homepage", "philosophy")}
            />
          )}

          {/* 4. Brand story teaser */}
          {visible("homepage.aboutTeaser") && (
            <NoiseAboutTeaser
              overline={f["noise.homepage-about-overline"] ?? ""}
              heading={f["noise.homepage-about-heading"] ?? ""}
              body={aboutTeaserBody as TiptapJSON | null}
              image={f["noise.homepage-about-image"] ?? ""}
              buttonText={f["noise.homepage-about-button-text"] ?? ""}
              buttonLink={aboutCtaHref}
              monogram={monogram}
              sectionAttrs={sectionGroupAttr("homepage", "aboutTeaser")}
            />
          )}

          {/* 5. Collections showcase — B2.1: the whole section is a
              collections surface */}
          {flags.isEnabled("collections") && visible("homepage.collections") && (
            <NoiseCollectionShowcase
              overline={nonBlank(f["noise.homepage.rail-one-overline"])}
              title={nonBlank(f["noise.homepage-featured-title"])}
              description={nonBlank(f["noise.homepage-featured-description"])}
              ctaText={nonBlank(f["noise.homepage-featured-button-text"])}
              ctaHref={collectionsCtaHref}
              collections={showcaseCollections}
              sectionAttrs={sectionGroupAttr("homepage", "collections")}
              showWhenEmpty={isPreview && flags.isEnabled("collections")}
            />
          )}

          {/* 6. Blog teaser — only while the Blog feature is on */}
          {flags.isEnabled("blog") && visible("homepage.blogTeaser") && (
            <NoiseEditorialSplit
              overline={f["noise.homepage.blog-teaser-overline"] ?? ""}
              heading={f["noise.homepage.blog-teaser-heading"] ?? ""}
              body={f["noise.homepage.blog-teaser-body"] ?? ""}
              ctaText={f["noise.homepage.blog-teaser-button-text"] ?? ""}
              ctaHref={blogTeaserCtaHref}
              image={f["noise.homepage.blog-teaser-image"] ?? ""}
              sectionAttrs={sectionGroupAttr("homepage", "blogTeaser")}
            />
          )}

          {/* 7. Latest arrivals — B2.1: the whole section is a products
              surface; also hidden on the live site when nothing is live */}
          {flags.isEnabled("products") && visible("homepage.featured") && (
            <NoiseProductRail
              overline={nonBlank(f["noise.homepage.rail-two-overline"])}
              overlineFieldKey="noise.homepage.rail-two-overline"
              title={nonBlank(f["noise.homepage.rail-two-title"])}
              titleFieldKey="noise.homepage.rail-two-title"
              ctaText={nonBlank(f["noise.homepage.latest-button-text"])}
              ctaTextFieldKey="noise.homepage.latest-button-text"
              ctaHref={latestCtaHref}
              products={latestProducts}
              sectionAttrs={sectionGroupAttr("homepage", "featured")}
              showWhenEmpty={isPreview && flags.isEnabled("products")}
            />
          )}

          {/* 8. Guarantee */}
          {visible("homepage.guarantee") && (
            <NoiseGuaranteeSection
              overline={f["noise.homepage-guarantee-overline"] ?? ""}
              heading={f["noise.homepage-guarantee-heading"] ?? ""}
              headingAccent={f["noise.homepage-guarantee-headingAccent"] ?? ""}
              body={nonBlank(f["noise.homepage-guarantee-quote"])}
              stamp={nonBlank(f["noise.homepage-guarantee-stamp"])}
              image={nonBlank(f["noise.homepage-guarantee-image"])}
              monogram={monogram}
              sectionAttrs={sectionGroupAttr("homepage", "guarantee")}
            />
          )}

          {/* 9. Rotating testimonial strip */}
          {flags.isEnabled("testimonials") &&
            visible("homepage.testimonials") && (
              <NoiseTestimonialStrip
                testimonials={testimonials}
                heading={f["noise.homepage-testimonials-heading"] ?? ""}
                sectionAttrs={sectionGroupAttr("homepage", "testimonials")}
              />
            )}
        </PageTransition>
      </NoiseIntroWrapper>
    </HydrateClient>
  );
}
