import type { DefaultHomepageTemplateProps } from "../../types";
import type { UmscReviewCardData } from "./umsc-reviews-section";
import type { Product } from "~/types";
import { navHrefFlag } from "~/app/(storefront)/_components/nav/nav-flags";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { resolvePopup } from "~/lib/site-banner/resolve";
import { isSectionVisible } from "~/lib/sp-meta";
import {
  getRawCustomFieldString,
  parseTemplateListRows,
  resolveFaqPickerItems,
} from "~/lib/template-fields";
import { api, HydrateClient } from "~/trpc/server";
import { PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import { nonBlank } from "../shared/umsc-non-blank";
import { UmscCategoriesSection } from "./umsc-categories-section";
import { UmscCustomSection } from "./umsc-custom-section";
import { UmscFaqSection } from "./umsc-faq-section";
import { UmscFeaturedSection } from "./umsc-featured-section";
import { UmscHeroSection } from "./umsc-hero-section";
import { UmscPopup } from "./umsc-popup";
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
export async function UmscHomepage(props?: DefaultHomepageTemplateProps) {
  const [homepage, { isEnabled }] = await Promise.all([
    api.business.getHomepage(),
    getBusinessFlags(),
  ]);

  const customFields = homepage?.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  // B2.4: the owner's popup. `getHomepage` doesn't select `popupConfig` (it's
  // not needed for the fields/products it returns), so this reads from the
  // richer `business` prop instead — same source noise/olive/vii use.
  const popup = resolvePopup(props?.business?.siteContent, isEnabled("popups"));

  // B2.5: hide a field-driven CTA/door/link when its route's flag is off —
  // never swap in another destination. A section may already require its
  // own flag to render at all; this only bites when the owner points a link
  // at a *different*, flag-gated route (e.g. a "/shop" button on a section
  // that isn't itself gated on "products"). `resolveFields` already applies
  // each key's own default (e.g. "/shop") when the field is unset, so
  // `f[key] ?? ""` — never `?? "/shop"` — is the resolved href; a blank href
  // (the owner cleared the field) stays blank rather than being overridden.
  const ctaFlagOk = (href: string): boolean => {
    const flag = navHrefFlag(href);
    return flag === null || isEnabled(flag);
  };

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
    "umsc.homepage.reviews-empty-text",
    "umsc.homepage.reviews-owner-source",
    "umsc.homepage.reviews-verified-source",
    "umsc.homepage.reviews-anonymous-name",
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

  // ── Shop by type: the store's first four published collections ──────────
  // `getAllPublic` is featureGate("collections")'d (and the flag cascades off
  // with "products"), so the flag guard is required. Already ordered by
  // sortOrder; `_count.collectionProducts` counts published products only.
  // When there are none (flag off, or no published collections yet), the
  // section render below is skipped entirely rather than showing an empty band.
  const collections = isEnabled("collections")
    ? await api.collections.getAllPublic().catch(() => [])
    : [];
  const categoryDoors = collections.slice(0, 4).map((collection) => {
    const count = collection._count.collectionProducts;
    return {
      id: collection.id,
      href: `/collections/${collection.slug}`,
      title: collection.name,
      blurb:
        nonBlank(collection.description) ??
        `${count} item${count !== 1 ? "s" : ""}`,
      image: collection.imageUrl ?? undefined,
    };
  });
  const customLines = parseTemplateListRows(
    customFields?.["umsc.homepage.custom-list"],
  );

  // ── Field-driven CTA/link hrefs (B2.5) — filtered, never swapped ────────
  const heroPrimaryUrlRaw = f["umsc.homepage.hero-primary-url"] ?? "";
  const heroPrimaryUrl = ctaFlagOk(heroPrimaryUrlRaw) ? heroPrimaryUrlRaw : "";
  const heroSecondaryUrlRaw = f["umsc.homepage.hero-secondary-url"] ?? "";
  const heroSecondaryUrl = ctaFlagOk(heroSecondaryUrlRaw)
    ? heroSecondaryUrlRaw
    : "";

  const categoriesAllUrlRaw = f["umsc.homepage.categories-all-url"] ?? "";
  const categoriesAllUrl = ctaFlagOk(categoriesAllUrlRaw)
    ? categoriesAllUrlRaw
    : "";

  const storyCtaUrlRaw = f["umsc.homepage.story-cta-url"] ?? "";
  const storyCtaUrl = ctaFlagOk(storyCtaUrlRaw) ? storyCtaUrlRaw : "";

  const railCtaUrlRaw = f["umsc.homepage.rail-cta-url"] ?? "";
  const railCtaUrl = ctaFlagOk(railCtaUrlRaw) ? railCtaUrlRaw : "";

  const customCtaUrlRaw = f["umsc.homepage.custom-cta-url"] ?? "";
  const customCtaUrl = ctaFlagOk(customCtaUrlRaw) ? customCtaUrlRaw : "";
  const customSecondaryUrlRaw = f["umsc.homepage.custom-secondary-url"] ?? "";
  const customSecondaryUrl = ctaFlagOk(customSecondaryUrlRaw)
    ? customSecondaryUrlRaw
    : "";

  const faqAllUrlRaw = f["umsc.homepage.faq-all-url"] ?? "";
  const faqAllUrl = ctaFlagOk(faqAllUrlRaw) ? faqAllUrlRaw : "";

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
  // The override quote/name fields were retired 2026-09-26 (testimonials are
  // owned by Admin → Testimonials); a quote saved before then is still read
  // here as a silent legacy fallback.
  const overrideQuote =
    nonBlank(
      getRawCustomFieldString(
        customFields,
        "umsc.homepage.reviews-override-quote",
      ),
    ) ?? "";
  const overrideName =
    nonBlank(
      getRawCustomFieldString(
        customFields,
        "umsc.homepage.reviews-override-name",
      ),
    ) ?? "";
  const hasOverride = overrideQuote.length > 0;
  const anonymousReviewerName = f["umsc.homepage.reviews-anonymous-name"] ?? "";
  const ownerReviewSource = f["umsc.homepage.reviews-owner-source"] ?? "";
  const verifiedReviewSource = f["umsc.homepage.reviews-verified-source"] ?? "";
  const reviewCards: UmscReviewCardData[] = [
    ...(hasOverride
      ? [
          {
            quote: overrideQuote,
            name: overrideName || anonymousReviewerName,
            source: "Featured review",
          },
        ]
      : []),
    ...testimonials.slice(0, hasOverride ? 2 : 3).map((t) => ({
      quote: t.text,
      name: t.customerName,
      source: t.source === "owner" ? ownerReviewSource : verifiedReviewSource,
    })),
  ];

  // ── Questions: owner-picked FAQ items, else the first three published ───
  const faqItems = await api.faq.list().catch(() => []);
  const faqTop3 = resolveFaqPickerItems(
    customFields?.["umsc.homepage.faq-items"],
    faqItems,
    3,
  ).map((item) => ({
    id: item.id,
    question: item.question,
    answer: item.answer,
  }));

  return (
    <HydrateClient>
      {popup ? <UmscPopup popup={popup} /> : null}

      <PageTransition>
        <UmscHeroSection
          video={f["umsc.homepage.hero-video"] ?? undefined}
          image={f["umsc.homepage.hero-image"] ?? undefined}
          imageAlt={f["umsc.homepage.hero-image-alt"] ?? ""}
          headline={f["umsc.homepage.hero-headline"] ?? ""}
          lede={f["umsc.homepage.hero-lede"] ?? ""}
          primaryLabel={f["umsc.homepage.hero-primary-label"] ?? ""}
          primaryUrl={heroPrimaryUrl}
          secondaryLabel={f["umsc.homepage.hero-secondary-label"] ?? ""}
          secondaryUrl={heroSecondaryUrl}
        />

        {/* PF10 (B2.1(4)): the featured shelf shows real Product records
            (links into /shop/[slug]), so it must not render at all when
            "products" is off — not just fall back to its empty-state tiles,
            which are reserved for "products on, zero SKUs yet". */}
        {isSectionVisible(customFields, "umsc", "homepage.featured") &&
          isEnabled("products") && (
            <UmscFeaturedSection
              heading={f["umsc.homepage.featured-heading"] ?? ""}
              emptyText={f["umsc.homepage.featured-empty-text"] ?? ""}
              products={featuredProducts as Product[]}
              sectionAttrs={sectionGroupAttr("homepage", "featured")}
            />
          )}

        {/* The cards are the store's real collections (gated on the
            "collections" flag above) — with none to show, skip the section
            instead of rendering an empty band with just the heading. */}
        {isSectionVisible(customFields, "umsc", "homepage.categories") &&
          categoryDoors.length > 0 && (
            <UmscCategoriesSection
              heading={f["umsc.homepage.categories-heading"] ?? ""}
              lede={f["umsc.homepage.categories-lede"] ?? ""}
              doors={categoryDoors}
              allLabel={f["umsc.homepage.categories-all-label"] ?? ""}
              allUrl={categoriesAllUrl}
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
            ctaUrl={storyCtaUrl}
            sectionAttrs={sectionGroupAttr("homepage", "story")}
          />
        )}

        {/* PF10 (B2.1(4)): same reasoning as the featured shelf above — this
            rail also renders real Product records. */}
        {isSectionVisible(customFields, "umsc", "homepage.rail") &&
          isEnabled("products") && (
            <UmscRailSection
              heading={f["umsc.homepage.rail-heading"] ?? ""}
              ctaLabel={f["umsc.homepage.rail-cta-label"] ?? ""}
              ctaUrl={railCtaUrl}
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
            ctaUrl={customCtaUrl}
            secondaryLabel={f["umsc.homepage.custom-secondary-label"] ?? ""}
            secondaryUrl={customSecondaryUrl}
            lines={customLines}
            sectionAttrs={sectionGroupAttr("homepage", "custom")}
          />
        )}

        {/* Hidden until at least one question is published in Content → FAQ. */}
        {isSectionVisible(customFields, "umsc", "homepage.faq") &&
          faqTop3.length > 0 && (
            <UmscFaqSection
              heading={f["umsc.homepage.faq-heading"] ?? ""}
              lede={f["umsc.homepage.faq-lede"] ?? ""}
              allLabel={f["umsc.homepage.faq-all-label"] ?? ""}
              allUrl={faqAllUrl}
              items={faqTop3}
              sectionAttrs={sectionGroupAttr("homepage", "faq")}
            />
          )}
      </PageTransition>
    </HydrateClient>
  );
}
