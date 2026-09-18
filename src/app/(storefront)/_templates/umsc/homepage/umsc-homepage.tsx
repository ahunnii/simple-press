import type { DefaultHomepageTemplateProps } from "../../types";
import type { UmscReviewCardData } from "./umsc-reviews-section";
import type { Product } from "~/types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { parseTemplateListRows } from "~/lib/template-fields";
import { api, HydrateClient } from "~/trpc/server";
import { PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import { UmscCategoriesSection } from "./umsc-categories-section";
import { UmscCustomSection } from "./umsc-custom-section";
import { UmscFaqSection } from "./umsc-faq-section";
import { UmscFeaturedSection } from "./umsc-featured-section";
import { UmscHeroSection } from "./umsc-hero-section";
import { UmscRailSection } from "./umsc-rail-section";
import { UmscReviewsSection } from "./umsc-reviews-section";
import { UmscStorySection } from "./umsc-story-section";

/**
 * UmscHomepage — mirrors vii-homepage.tsx's data-flow shape
 * (`api.business.getHomepage`, `resolveFields`, `HydrateClient` +
 * `PageTransition`). Hero (order 0) + the seven homepage sections from
 * design.md "Per-page section concepts → Homepage" (groups 2–8), each gated
 * by `isSectionVisible`.
 */
export async function UmscHomepage(_props?: DefaultHomepageTemplateProps) {
  const [homepage, { isEnabled }] = await Promise.all([
    api.business.getHomepage(),
    getBusinessFlags(),
  ]);

  const customFields = homepage?.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields, [
    // Hero
    "umsc.homepage.hero-video",
    "umsc.homepage.hero-image",
    "umsc.homepage.hero-image-alt",
    "umsc.homepage.hero-headline",
    "umsc.homepage.hero-lede",
    "umsc.homepage.hero-primary-label",
    "umsc.homepage.hero-primary-url",
    "umsc.homepage.hero-secondary-label",
    "umsc.homepage.hero-secondary-url",
    // Featured shelf
    "umsc.homepage.featured-heading",
    "umsc.homepage.featured-collection",
    "umsc.homepage.featured-empty-text",
    // Shop by type
    "umsc.homepage.categories-heading",
    "umsc.homepage.categories-lede",
    "umsc.homepage.categories-all-label",
    "umsc.homepage.categories-all-url",
    // Story
    "umsc.homepage.story-image",
    "umsc.homepage.story-image-alt",
    "umsc.homepage.story-heading",
    "umsc.homepage.story-lede",
    "umsc.homepage.story-paragraph",
    "umsc.homepage.story-cta-label",
    "umsc.homepage.story-cta-url",
    // New this season
    "umsc.homepage.rail-heading",
    "umsc.homepage.rail-cta-label",
    "umsc.homepage.rail-cta-url",
    "umsc.homepage.rail-collection",
    "umsc.homepage.rail-empty-text",
    // Reviews
    "umsc.homepage.reviews-heading",
    "umsc.homepage.reviews-lede",
    "umsc.homepage.reviews-override-quote",
    "umsc.homepage.reviews-override-name",
    "umsc.homepage.reviews-empty-text",
    // Custom band
    "umsc.homepage.custom-heading",
    "umsc.homepage.custom-lede",
    "umsc.homepage.custom-cta-label",
    "umsc.homepage.custom-cta-url",
    "umsc.homepage.custom-secondary-label",
    "umsc.homepage.custom-secondary-url",
    // Questions
    "umsc.homepage.faq-heading",
    "umsc.homepage.faq-lede",
    "umsc.homepage.faq-all-label",
    "umsc.homepage.faq-all-url",
    // Global
    "umsc.global.google-review-url",
  ]);

  // ── Category doors (list field) ─────────────────────────────────────────
  const categoryDoors = parseTemplateListRows(
    customFields?.["umsc.homepage.categories-doors"],
  );
  const customLines = parseTemplateListRows(
    customFields?.["umsc.homepage.custom-list"],
  );

  // ── Featured shelf: collection field → fallback to latest products ─────
  const featuredCollectionId = f["umsc.homepage.featured-collection"] ?? "";
  const featuredCollectionData =
    isEnabled("collections") && featuredCollectionId.trim()
      ? await api.collections.getProductsByCollectionId(featuredCollectionId)
      : null;
  const featuredProducts = (
    featuredCollectionData?.products ??
    homepage?.products ??
    []
  ).slice(0, 4);

  // ── New this season rail: second collection field → fallback offset by 4
  //    so it doesn't repeat the featured shelf when both are unset ──────────
  const railCollectionId = f["umsc.homepage.rail-collection"] ?? "";
  const railCollectionData =
    isEnabled("collections") && railCollectionId.trim()
      ? await api.collections.getProductsByCollectionId(railCollectionId)
      : null;
  const railProducts = railCollectionData
    ? railCollectionData.products.slice(0, 4)
    : (homepage?.products ?? []).slice(4, 8);

  // ── Reviews: latest approved testimonials, manual override wins slot 1 ──
  const testimonials = isEnabled("testimonials")
    ? await api.testimonial.list({ publicOnly: true }).catch(() => [])
    : [];
  const overrideQuote = f["umsc.homepage.reviews-override-quote"] ?? "";
  const overrideName = f["umsc.homepage.reviews-override-name"] ?? "";
  const hasOverride = overrideQuote.trim().length > 0;
  const reviewCards: UmscReviewCardData[] = [
    ...(hasOverride
      ? [
          {
            quote: overrideQuote,
            name: overrideName || "A customer",
            source: "Featured review",
          },
        ]
      : []),
    ...testimonials.slice(0, hasOverride ? 2 : 3).map((t) => ({
      quote: t.text,
      name: t.customerName,
      source: t.source === "owner" ? "From Monique" : "Verified order",
    })),
  ];

  // ── Questions: first three published FAQ items ──────────────────────────
  const faqItems = await api.faq.list().catch(() => []);
  const faqTop3 = faqItems.slice(0, 3).map((item) => ({
    id: item.id,
    question: item.question,
    answer: item.answer,
  }));

  return (
    <HydrateClient>
      <PageTransition>
        <UmscHeroSection
          video={f["umsc.homepage.hero-video"] ?? undefined}
          image={f["umsc.homepage.hero-image"] ?? undefined}
          imageAlt={f["umsc.homepage.hero-image-alt"] ?? ""}
          headline={f["umsc.homepage.hero-headline"] ?? ""}
          lede={f["umsc.homepage.hero-lede"] ?? ""}
          primaryLabel={f["umsc.homepage.hero-primary-label"] ?? ""}
          primaryUrl={f["umsc.homepage.hero-primary-url"] ?? "/shop"}
          secondaryLabel={f["umsc.homepage.hero-secondary-label"] ?? ""}
          secondaryUrl={f["umsc.homepage.hero-secondary-url"] ?? "/shop"}
        />

        {isSectionVisible(customFields, "umsc", "homepage.featured") && (
          <UmscFeaturedSection
            heading={f["umsc.homepage.featured-heading"] ?? ""}
            emptyText={f["umsc.homepage.featured-empty-text"] ?? ""}
            products={featuredProducts as Product[]}
            sectionAttrs={sectionGroupAttr("homepage", "featured")}
          />
        )}

        {isSectionVisible(customFields, "umsc", "homepage.categories") && (
          <UmscCategoriesSection
            heading={f["umsc.homepage.categories-heading"] ?? ""}
            lede={f["umsc.homepage.categories-lede"] ?? ""}
            doors={categoryDoors}
            allLabel={f["umsc.homepage.categories-all-label"] ?? ""}
            allUrl={f["umsc.homepage.categories-all-url"] ?? "/shop"}
            sectionAttrs={sectionGroupAttr("homepage", "categories")}
          />
        )}

        {isSectionVisible(customFields, "umsc", "homepage.story") && (
          <UmscStorySection
            image={f["umsc.homepage.story-image"] ?? undefined}
            imageAlt={f["umsc.homepage.story-image-alt"] ?? ""}
            heading={f["umsc.homepage.story-heading"] ?? ""}
            lede={f["umsc.homepage.story-lede"] ?? ""}
            paragraph={f["umsc.homepage.story-paragraph"] ?? ""}
            ctaLabel={f["umsc.homepage.story-cta-label"] ?? ""}
            ctaUrl={f["umsc.homepage.story-cta-url"] ?? "/about"}
            sectionAttrs={sectionGroupAttr("homepage", "story")}
          />
        )}

        {isSectionVisible(customFields, "umsc", "homepage.rail") && (
          <UmscRailSection
            heading={f["umsc.homepage.rail-heading"] ?? ""}
            ctaLabel={f["umsc.homepage.rail-cta-label"] ?? ""}
            ctaUrl={f["umsc.homepage.rail-cta-url"] ?? "/shop"}
            emptyText={f["umsc.homepage.rail-empty-text"] ?? ""}
            products={railProducts as Product[]}
            sectionAttrs={sectionGroupAttr("homepage", "rail")}
          />
        )}

        {isSectionVisible(customFields, "umsc", "homepage.reviews") && (
          <UmscReviewsSection
            heading={f["umsc.homepage.reviews-heading"] ?? ""}
            lede={f["umsc.homepage.reviews-lede"] ?? ""}
            cards={reviewCards}
            emptyText={f["umsc.homepage.reviews-empty-text"] ?? ""}
            googleReviewUrl={f["umsc.global.google-review-url"] ?? ""}
            sectionAttrs={sectionGroupAttr("homepage", "reviews")}
          />
        )}

        {isSectionVisible(customFields, "umsc", "homepage.custom") && (
          <UmscCustomSection
            heading={f["umsc.homepage.custom-heading"] ?? ""}
            lede={f["umsc.homepage.custom-lede"] ?? ""}
            ctaLabel={f["umsc.homepage.custom-cta-label"] ?? ""}
            ctaUrl={f["umsc.homepage.custom-cta-url"] ?? "/contact?type=custom"}
            secondaryLabel={f["umsc.homepage.custom-secondary-label"] ?? ""}
            secondaryUrl={f["umsc.homepage.custom-secondary-url"] ?? "/contact"}
            lines={customLines}
            sectionAttrs={sectionGroupAttr("homepage", "custom")}
          />
        )}

        {isSectionVisible(customFields, "umsc", "homepage.faq") &&
          faqTop3.length > 0 && (
            <UmscFaqSection
              heading={f["umsc.homepage.faq-heading"] ?? ""}
              lede={f["umsc.homepage.faq-lede"] ?? ""}
              allLabel={f["umsc.homepage.faq-all-label"] ?? ""}
              allUrl={f["umsc.homepage.faq-all-url"] ?? "/faq"}
              items={faqTop3}
              sectionAttrs={sectionGroupAttr("homepage", "faq")}
            />
          )}
      </PageTransition>
    </HydrateClient>
  );
}
