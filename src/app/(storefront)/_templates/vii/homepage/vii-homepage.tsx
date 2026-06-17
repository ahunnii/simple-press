import type { DefaultHomepageTemplateProps } from "../../types";
import { db } from "~/server/db";
import { api, HydrateClient } from "~/trpc/server";
import { PageTransition } from "~/components/page-animations";
import { parseTemplateListRows } from "~/lib/template-fields";

import { resolveFields } from "..";
import { ViiHeroSection } from "./vii-hero-section";
import { ViiWellbeingSection } from "./vii-wellbeing-section";
import { ViiCategorySection } from "./vii-category-section";
import { ViiStorySection } from "./vii-story-section";
import { ViiJourneysSection } from "./vii-journeys-section";
import { ViiProductRail } from "./vii-product-rail";
import { ViiImageBand } from "./vii-image-band";
import { ViiTestimonialQuote } from "./vii-testimonial-quote";
import { ViiExploreSection } from "./vii-explore-section";
import { ViiBrandsSection } from "./vii-brands-section";
import { ViiContactCtaSection } from "./vii-contact-cta-section";
import { ViiInstagramStrip } from "./vii-instagram-strip";

export async function ViiHomepage(_props?: DefaultHomepageTemplateProps) {
  const homepage = await api.business.getHomepage();

  const customFields = homepage?.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields, [
    // Hero
    "vii.homepage.hero-video",
    "vii.homepage.hero-image",
    "vii.homepage.hero-overline",
    "vii.homepage.hero-heading",
    "vii.homepage.hero-cta-text",
    "vii.homepage.hero-cta-link",
    // Wellbeing
    "vii.homepage.wellbeing-heading",
    "vii.homepage.wellbeing-heading-accent",
    "vii.homepage.wellbeing-body",
    // Categories
    "vii.homepage.categories-overline",
    "vii.homepage.categories-heading",
    // Product rail
    "vii.homepage.product-rail-overline",
    "vii.homepage.product-rail-heading",
    "vii.homepage.product-rail-collection",
    "vii.homepage.product-rail-cta-text",
    "vii.homepage.product-rail-cta-link",
    // Brands
    "vii.homepage.brands-overline",
    "vii.homepage.brands-heading",
    // Story
    "vii.homepage.story-heading",
    "vii.homepage.story-heading-accent",
    "vii.homepage.story-intro",
    // Journeys
    "vii.homepage.journeys-overline",
    "vii.homepage.journeys-heading-accent",
    "vii.homepage.journeys-intro",
    // Band
    "vii.homepage.band-image",
    // Testimonial
    "vii.homepage.quote-image",
    "vii.homepage.quote-text",
    "vii.homepage.quote-author",
    // Explore
    "vii.homepage.explore-overline",
    "vii.homepage.explore-heading",
    "vii.homepage.explore-image",
    "vii.homepage.explore-gallery-link-text",
    "vii.homepage.explore-gallery-link",
    "vii.homepage.explore-package-title",
    "vii.homepage.explore-package-body",
    "vii.homepage.explore-package-image",
    "vii.homepage.explore-package-cta-text",
    "vii.homepage.explore-package-cta-link",
    // Contact
    "vii.homepage.contact-image",
    "vii.homepage.contact-heading",
    "vii.homepage.contact-subheading",
    "vii.homepage.contact-body",
    "vii.homepage.contact-phone",
    "vii.homepage.contact-email",
    // Instagram
    "vii.homepage.instagram-handle",
    "vii.homepage.instagram-gallery",
  ]);

  // ── Parse list fields from raw customFields ───────────────────────────────
  const awards = parseTemplateListRows(
    customFields?.["vii.homepage.wellbeing-awards"],
  );
  const storyCards = parseTemplateListRows(
    customFields?.["vii.homepage.story-cards"],
  );
  const journeysCards = parseTemplateListRows(
    customFields?.["vii.homepage.journeys-cards"],
  );
  const exploreTabs = parseTemplateListRows(
    customFields?.["vii.homepage.explore-tabs"],
  );
  const categoryCards = parseTemplateListRows(
    customFields?.["vii.homepage.categories-cards"],
  );
  const brandLogos = parseTemplateListRows(
    customFields?.["vii.homepage.brands-logos"],
  );

  // ── Resolve product rail (collection → fallback to latest products) ────────
  const railCollectionId = f["vii.homepage.product-rail-collection"] ?? "";
  const railData = railCollectionId.trim()
    ? await api.collections.getProductsByCollectionId(railCollectionId)
    : null;
  const railProducts = railData?.products ?? homepage?.products ?? [];
  const railCtaHref = railData
    ? `/collections/${railData.collection.slug}`
    : (f["vii.homepage.product-rail-cta-link"] ?? "/shop");

  // ── Resolve Instagram gallery ─────────────────────────────────────────────
  const instagramGalleryId = f["vii.homepage.instagram-gallery"];
  const instagramGallery =
    instagramGalleryId?.trim()
      ? await db.gallery.findUnique({
          where: { id: instagramGalleryId },
          include: { images: { orderBy: { sortOrder: "asc" } } },
        })
      : null;
  const instagramImages =
    instagramGallery?.images.map((img) => ({
      url: img.url,
      altText: img.altText ?? "",
    })) ?? [];

  return (
    <HydrateClient>
      <PageTransition>
        {/* 1. Hero */}
        <ViiHeroSection
          heroVideo={f["vii.homepage.hero-video"] ?? undefined}
          heroImage={f["vii.homepage.hero-image"] ?? undefined}
          heroOverline={f["vii.homepage.hero-overline"] ?? ""}
          heroHeading={f["vii.homepage.hero-heading"] ?? ""}
          heroCtaText={f["vii.homepage.hero-cta-text"] ?? ""}
          heroCtaLink={f["vii.homepage.hero-cta-link"] ?? "/contact"}
        />

        {/* 2. Wellbeing */}
        <ViiWellbeingSection
          heading={f["vii.homepage.wellbeing-heading"] ?? ""}
          headingAccent={f["vii.homepage.wellbeing-heading-accent"] ?? ""}
          body={f["vii.homepage.wellbeing-body"] ?? ""}
          awards={awards}
        />

        {/* 3. Categories */}
        <ViiCategorySection
          overline={f["vii.homepage.categories-overline"] ?? ""}
          heading={f["vii.homepage.categories-heading"] ?? ""}
          cards={categoryCards}
        />

        {/* 4. Story */}
        <ViiStorySection
          heading={f["vii.homepage.story-heading"] ?? ""}
          headingAccent={f["vii.homepage.story-heading-accent"] ?? ""}
          intro={f["vii.homepage.story-intro"] ?? ""}
          cards={storyCards}
        />

        {/* 4. Journeys */}
        <ViiJourneysSection
          overline={f["vii.homepage.journeys-overline"] ?? ""}
          headingAccent={f["vii.homepage.journeys-heading-accent"] ?? ""}
          intro={f["vii.homepage.journeys-intro"] ?? ""}
          cards={journeysCards}
        />

        {/* 6. Product Rail */}
        <ViiProductRail
          overline={f["vii.homepage.product-rail-overline"] ?? ""}
          heading={f["vii.homepage.product-rail-heading"] ?? ""}
          ctaText={f["vii.homepage.product-rail-cta-text"] ?? "Shop All"}
          ctaHref={railCtaHref}
          products={railProducts}
        />

        {/* 7. Image Band */}
        <ViiImageBand bandImage={f["vii.homepage.band-image"] ?? undefined} />

        {/* 6. Testimonial Quote */}
        <ViiTestimonialQuote
          quoteImage={f["vii.homepage.quote-image"] ?? undefined}
          quoteText={f["vii.homepage.quote-text"] ?? ""}
          quoteAuthor={f["vii.homepage.quote-author"] ?? ""}
        />

        {/* 7. Explore */}
        <ViiExploreSection
          overline={f["vii.homepage.explore-overline"] ?? ""}
          heading={f["vii.homepage.explore-heading"] ?? ""}
          exploreImage={f["vii.homepage.explore-image"] ?? undefined}
          tabs={exploreTabs}
          galleryLinkText={f["vii.homepage.explore-gallery-link-text"] ?? ""}
          galleryLink={f["vii.homepage.explore-gallery-link"] ?? "/gallery"}
          packageTitle={f["vii.homepage.explore-package-title"] ?? ""}
          packageBody={f["vii.homepage.explore-package-body"] ?? ""}
          packageImage={f["vii.homepage.explore-package-image"] ?? undefined}
          packageCtaText={f["vii.homepage.explore-package-cta-text"] ?? ""}
          packageCtaLink={
            f["vii.homepage.explore-package-cta-link"] ?? "/contact"
          }
        />

        {/* 10. Brands We Carry */}
        <ViiBrandsSection
          overline={f["vii.homepage.brands-overline"] ?? ""}
          heading={f["vii.homepage.brands-heading"] ?? ""}
          logos={brandLogos}
        />

        {/* 11. Contact CTA */}
        <ViiContactCtaSection
          contactImage={f["vii.homepage.contact-image"] ?? undefined}
          heading={f["vii.homepage.contact-heading"] ?? ""}
          subheading={f["vii.homepage.contact-subheading"] ?? ""}
          body={f["vii.homepage.contact-body"] ?? ""}
          phone={f["vii.homepage.contact-phone"] ?? ""}
          email={f["vii.homepage.contact-email"] ?? ""}
        />

        {/* 9. Instagram Strip */}
        <ViiInstagramStrip
          handle={f["vii.homepage.instagram-handle"] ?? ""}
          images={instagramImages}
        />
      </PageTransition>
    </HydrateClient>
  );
}
