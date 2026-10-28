import type { DefaultHomepageTemplateProps } from "../../types";
import type { OliveCardProduct } from "../shared";
import type { OliveBlogTeaser } from "./olive-blog-section";
import type { OliveCategoryEntry } from "./olive-category-section";
import type { OliveFeedImage } from "./olive-feed-section";
import type { OliveHeroImage } from "./olive-hero-section";
import type { OlivePressLogo } from "./olive-press-section";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { resolvePopup } from "~/lib/site-banner/resolve";
import { isSectionVisible } from "~/lib/sp-meta";
import { parseTemplateListRows } from "~/lib/template-fields";
import { formatDate } from "~/lib/utils";
import { api, HydrateClient } from "~/trpc/server";
import { navHrefOffFlag } from "~/app/(storefront)/_components/nav/nav-flags";

import { resolveFields } from "..";
import { hasOliveImage, OlivePromoSection } from "../shared";
import { OliveBandSection } from "./olive-band-section";
import { OliveBlogSection } from "./olive-blog-section";
import { OliveCategorySection } from "./olive-category-section";
import { OliveFeedSection } from "./olive-feed-section";
import { OliveHeroSection } from "./olive-hero-section";
import { OliveMoodSection } from "./olive-mood-section";
import { OliveNewsletterSection } from "./olive-newsletter-section";
import { OlivePopup } from "./olive-popup";
import { OlivePressSection } from "./olive-press-section";
import { OliveProductRail } from "./olive-product-rail";
import { OliveStorySection } from "./olive-story-section";
import { OliveTestimonialSection } from "./olive-testimonial-section";

type OliveCollections = Awaited<
  ReturnType<typeof api.collections.getAllPublic>
>;
type OliveRailProducts = Awaited<
  ReturnType<typeof api.product.getRailProducts>
>;
type OliveBlogPages = Awaited<ReturnType<typeof api.content.getBlogPages>>;
type OliveTestimonials = Awaited<ReturnType<typeof api.testimonial.listRandom>>;
type OlivePolicyPages = Awaited<
  ReturnType<typeof api.content.getSimplifiedPages>
>;

/**
 * New arrivals is one lookbook row on the board: exactly four pieces across
 * on a laptop (two rows of two on a phone). Olive-only — the shared router's
 * own default limit is left alone for the other templates.
 */
const RAIL_COUNT = 4;

/** Reads one string cell out of a template list row. */
function rowText(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  return typeof value === "string" ? value.trim() : "";
}

/** A row's link cell, or the given fallback when the owner left it blank. */
function rowLink(row: Record<string, unknown>, fallback: string): string {
  const link = rowText(row, "link");
  return link.length > 0 ? link : fallback;
}

/** The store's own privacy policy when published, else the platform's. */
function resolvePrivacyHref(policyPages: readonly { slug: string }[]): string {
  const privacy = policyPages.find((page) => page.slug === "privacy-policy");
  return privacy ? `/${privacy.slug}` : "/platform/policies/privacy-policy";
}

/**
 * Olive Mode's homepage — a fashion-editorial spread that happens to sell.
 *
 * Twelve sections in the order design.md sets (2026-10-21): the cover hero,
 * New arrivals, The Edit band, Shop by occasion, the collection takeover,
 * the About split, two photo tiles, one customer quote, the feed, the press
 * strip, the journal and the Inner Circle sign-up (only while Email
 * marketing is on). Render order here, `order` in `homepage/index.ts` and the
 * `sectionGroupAttr` ids must stay in step.
 *
 * Everything a shopper reads is either an owner field (resolved here, passed
 * down as props) or real store data. Sections that would otherwise invent
 * content — press logos, feed photographs, a testimonial, a journal post —
 * render nothing until the data behind them exists.
 */
export async function OliveHomepage({
  business,
}: DefaultHomepageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const { isEnabled } = await getBusinessFlags();
  const popup = resolvePopup(business.siteContent, isEnabled);

  const f = resolveFields(customFields, [
    "olive.homepage.hero-video",
    "olive.homepage.hero-show-card",
    "olive.homepage.hero-eyebrow",
    "olive.homepage.hero-heading",
    "olive.homepage.hero-body",
    "olive.homepage.hero-cta-label",
    "olive.homepage.hero-cta-link",
    "olive.homepage.categories-heading",
    "olive.homepage.mood-one-image",
    "olive.homepage.mood-one-label",
    "olive.homepage.mood-one-link",
    "olive.homepage.mood-two-image",
    "olive.homepage.mood-two-label",
    "olive.homepage.mood-two-link",
    "olive.homepage.rail-heading",
    "olive.homepage.rail-collection",
    "olive.homepage.rail-link-label",
    "olive.homepage.rail-link",
    "olive.homepage.rail-empty-heading",
    "olive.homepage.rail-empty-body",
    "olive.homepage.promo-takeover",
    "olive.homepage.promo-eyebrow",
    "olive.homepage.promo-image",
    "olive.homepage.promo-heading",
    "olive.homepage.promo-body",
    "olive.homepage.promo-button-label",
    "olive.homepage.promo-button-link",
    "olive.homepage.band-eyebrow",
    "olive.homepage.band-heading",
    "olive.homepage.band-body",
    "olive.homepage.band-cta-label",
    "olive.homepage.band-cta-link",
    "olive.homepage.band-image",
    "olive.homepage.feed-heading",
    "olive.homepage.feed-handle",
    "olive.homepage.feed-url",
    "olive.homepage.press-heading",
    "olive.homepage.testimonial-link-label",
    "olive.homepage.testimonial-link",
    "olive.homepage.blog-heading",
    "olive.homepage.blog-link-label",
    "olive.homepage.blog-link",
    "olive.homepage.story-eyebrow",
    "olive.homepage.story-heading",
    "olive.homepage.story-body",
    "olive.homepage.story-button-label",
    "olive.homepage.story-button-link",
    "olive.homepage.story-image",
    "olive.homepage.newsletter-eyebrow",
    "olive.homepage.newsletter-heading",
    "olive.homepage.newsletter-body",
    "olive.homepage.newsletter-button-label",
    "olive.homepage.newsletter-image",
  ]);

  const showCategories = isSectionVisible(
    customFields,
    "olive",
    "homepage.categories",
  );
  const showFeed = isSectionVisible(customFields, "olive", "homepage.feed");
  const showPress = isSectionVisible(customFields, "olive", "homepage.press");
  const showTestimonial = isSectionVisible(
    customFields,
    "olive",
    "homepage.testimonial",
  );
  const showBlog = isSectionVisible(customFields, "olive", "homepage.blog");
  // The Inner Circle is a real double opt-in sign-up, so it only exists while
  // the store's Email marketing feature is on (`isEnabled` folds in flag
  // dependencies) — never a form that cannot subscribe anyone.
  const showNewsletter =
    isEnabled("emailMarketing") &&
    isSectionVisible(customFields, "olive", "homepage.newsletter");

  const railCollectionId = (f["olive.homepage.rail-collection"] ?? "").trim();
  const productsEnabled = isEnabled("products");

  // B2.5: hide a field-driven CTA/link when its route's flag is off — never
  // swap in another destination. A section may already require its own flag
  // to render at all; this only bites when the owner points a link at a
  // *different*, flag-gated route (e.g. a "/blog" tile on a section that
  // isn't itself gated on "blog").
  const ctaFlagOk = (href: string): boolean => {
    const flag = navHrefOffFlag(href, isEnabled);
    return flag === null || isEnabled(flag);
  };

  // Every remote read is optional: each procedure is feature-gated and throws
  // when its flag is off, so a missing catch would take the whole homepage
  // down with it.
  const [
    collections,
    railCollection,
    latestProducts,
    blogPages,
    testimonials,
    policyPages,
  ] = await Promise.all([
    showCategories
      ? api.collections.getAllPublic().catch(() => [] as OliveCollections)
      : Promise.resolve([] as OliveCollections),
    productsEnabled && railCollectionId
      ? api.collections
          .getProductsByCollectionId(railCollectionId)
          .catch(() => null)
      : Promise.resolve(null),
    // Always fetched while products are on, even when a collection is
    // featured: it is the fallback for a featured collection that has since
    // been unpublished, emptied or deleted.
    productsEnabled
      ? api.product
          .getRailProducts({ limit: RAIL_COUNT })
          .catch(() => [] as OliveRailProducts)
      : Promise.resolve([] as OliveRailProducts),
    showBlog
      ? api.content.getBlogPages().catch(() => [] as OliveBlogPages)
      : Promise.resolve([] as OliveBlogPages),
    showTestimonial && isEnabled("testimonials")
      ? api.testimonial
          .listRandom({ limit: 1 })
          .catch(() => [] as OliveTestimonials)
      : Promise.resolve([] as OliveTestimonials),
    // Only the sign-up needs the privacy link; a failed read falls back to
    // the platform policy.
    showNewsletter
      ? api.content
          .getSimplifiedPages({ type: "policy" })
          .catch(() => [] as OlivePolicyPages)
      : Promise.resolve([] as OlivePolicyPages),
  ]);

  // ── Category cards: the owner's list, or the shop's own collections ───────
  const ownerCategories: OliveCategoryEntry[] = parseTemplateListRows(
    customFields?.["olive.homepage.categories-cards"],
  )
    .map((row, index) => ({
      id: typeof row._id === "string" ? row._id : `category-${index}`,
      image: rowText(row, "image"),
      label: rowText(row, "label"),
      href: rowLink(row, "/shop"),
      sourceIndex: index,
    }))
    // B2.5: a gated card (its href names an off flag) is dropped entirely —
    // the whole tile is the link, so there is no separate CTA to hide.
    .filter((entry) => entry.label.length > 0 && ctaFlagOk(entry.href));

  const categoryEntries: OliveCategoryEntry[] =
    ownerCategories.length > 0
      ? ownerCategories
      : collections.slice(0, 4).map((collection) => ({
          id: collection.id,
          image: collection.imageUrl ?? "",
          label: collection.name,
          href: `/collections/${collection.slug}`,
        }));

  // ── Products ──────────────────────────────────────────────────────────────
  // The featured collection wins only while it actually has published
  // products; otherwise the rail — the page's one commerce row — would go to
  // the ghost card on a store full of stock.
  const collectionProducts =
    railCollection?.products.slice(0, RAIL_COUNT) ?? [];
  const showingCollection = collectionProducts.length > 0;
  const railProducts: OliveCardProduct[] = showingCollection
    ? collectionProducts
    : latestProducts;

  // ── Hero photographs ──────────────────────────────────────────────────────
  // Blank/placeholder rows are dropped here so the dots and the count only
  // ever see real photos; the first survivor is both the arrival frame and
  // the priority (LCP) frame the hero component pins to slide 0.
  const heroImages: OliveHeroImage[] = parseTemplateListRows(
    customFields?.["olive.homepage.hero-images"],
  )
    .map((row, index) => ({ src: rowText(row, "image"), index }))
    .filter((entry) => hasOliveImage(entry.src))
    .slice(0, 6);

  // ── Feed and press lists ──────────────────────────────────────────────────
  const feedImages: OliveFeedImage[] = parseTemplateListRows(
    customFields?.["olive.homepage.feed-images"],
  )
    .map((row, index) => ({
      id: typeof row._id === "string" ? row._id : `feed-${index}`,
      image: rowText(row, "image"),
      caption: rowText(row, "caption"),
      index,
    }))
    .filter((item) => hasOliveImage(item.image));

  const pressLogos: OlivePressLogo[] = parseTemplateListRows(
    customFields?.["olive.homepage.press-logos"],
  )
    .map((row, index) => ({
      id: typeof row._id === "string" ? row._id : `press-${index}`,
      image: rowText(row, "image"),
      name: rowText(row, "name"),
      index,
    }))
    .filter((logo) => hasOliveImage(logo.image));

  // ── Journal teasers ───────────────────────────────────────────────────────
  const blogPosts: OliveBlogTeaser[] = blogPages.slice(0, 3).map((page) => ({
    id: page.id,
    title: page.title,
    slug: page.slug,
    excerpt: page.excerpt ?? "",
    image: page.image ?? "",
    dateLabel: formatDate(page.createdAt),
  }));

  const testimonial = testimonials[0] ?? null;

  // ── Field-driven CTA/link hrefs ─────────────────────────────────────────
  // B2.5: resolve each once, hiding it (never swapping in another
  // destination) when its href names an off flag. Every key below has a
  // matching `defaultValue` in `homepage/index.ts` (`resolveFields` already
  // applies it for an unset field), so the `?? ""` here is only satisfying
  // `noUncheckedIndexedAccess` — it never actually fires.
  const heroCtaRaw = f["olive.homepage.hero-cta-link"] ?? "";
  const heroCtaHref = ctaFlagOk(heroCtaRaw) ? heroCtaRaw : "";

  const moodOneRaw = f["olive.homepage.mood-one-link"] ?? "";
  const moodOneHref = ctaFlagOk(moodOneRaw) ? moodOneRaw : "";
  const moodTwoRaw = f["olive.homepage.mood-two-link"] ?? "";
  const moodTwoHref = ctaFlagOk(moodTwoRaw) ? moodTwoRaw : "";

  const railLinkRaw = f["olive.homepage.rail-link"] ?? "";
  const railLinkHref =
    showingCollection && railCollection
      ? `/collections/${railCollection.collection.slug}`
      : ctaFlagOk(railLinkRaw)
        ? railLinkRaw
        : "";

  const promoButtonRaw = f["olive.homepage.promo-button-link"] ?? "";
  const promoButtonHref = ctaFlagOk(promoButtonRaw) ? promoButtonRaw : "";

  const bandCtaRaw = f["olive.homepage.band-cta-link"] ?? "";
  const bandCtaHref = ctaFlagOk(bandCtaRaw) ? bandCtaRaw : "";

  const testimonialLinkRaw = f["olive.homepage.testimonial-link"] ?? "";
  const testimonialLinkHref = ctaFlagOk(testimonialLinkRaw)
    ? testimonialLinkRaw
    : "";

  const blogLinkRaw = f["olive.homepage.blog-link"] ?? "";
  const blogLinkHref = ctaFlagOk(blogLinkRaw) ? blogLinkRaw : "";

  const storyButtonRaw = f["olive.homepage.story-button-link"] ?? "";
  const storyButtonHref = ctaFlagOk(storyButtonRaw) ? storyButtonRaw : "";

  return (
    <HydrateClient>
      {popup ? <OlivePopup popup={popup} /> : null}

      {/* `olive-home` lets globals.css collapse the doubled padding between
          two adjacent same-tone sections (e.g. the About split → photo
          tiles): the pair shares one --olive-section-pad-y, not two. */}
      <div className="olive-home">
        {/* 1 · Hero */}
        <OliveHeroSection
          images={heroImages}
          video={f["olive.homepage.hero-video"] ?? ""}
          showCard={f["olive.homepage.hero-show-card"] !== "false"}
          eyebrow={f["olive.homepage.hero-eyebrow"] ?? ""}
          heading={f["olive.homepage.hero-heading"] ?? ""}
          body={f["olive.homepage.hero-body"] ?? ""}
          ctaLabel={f["olive.homepage.hero-cta-label"] ?? ""}
          ctaHref={heroCtaHref}
          sectionAttrs={sectionGroupAttr("homepage", "hero")}
          eyebrowFieldKey="olive.homepage.hero-eyebrow"
          headingFieldKey="olive.homepage.hero-heading"
          bodyFieldKey="olive.homepage.hero-body"
          ctaLabelFieldKey="olive.homepage.hero-cta-label"
        />

        {/* 2 · New arrivals */}
        {productsEnabled ? (
          <OliveProductRail
            heading={f["olive.homepage.rail-heading"] ?? ""}
            linkLabel={f["olive.homepage.rail-link-label"] ?? ""}
            linkHref={railLinkHref}
            products={railProducts}
            emptyHeading={f["olive.homepage.rail-empty-heading"] ?? ""}
            emptyBody={f["olive.homepage.rail-empty-body"] ?? ""}
            sectionAttrs={sectionGroupAttr("homepage", "productRail")}
            headingFieldKey="olive.homepage.rail-heading"
            linkLabelFieldKey="olive.homepage.rail-link-label"
            emptyHeadingFieldKey="olive.homepage.rail-empty-heading"
            emptyBodyFieldKey="olive.homepage.rail-empty-body"
          />
        ) : null}

        {/* 3 · The Edit */}
        {isSectionVisible(customFields, "olive", "homepage.band") ? (
          <OliveBandSection
            eyebrow={f["olive.homepage.band-eyebrow"] ?? ""}
            heading={f["olive.homepage.band-heading"] ?? ""}
            body={f["olive.homepage.band-body"] ?? ""}
            ctaLabel={f["olive.homepage.band-cta-label"] ?? ""}
            ctaHref={bandCtaHref}
            image={f["olive.homepage.band-image"] ?? ""}
            sectionAttrs={sectionGroupAttr("homepage", "band")}
            eyebrowFieldKey="olive.homepage.band-eyebrow"
            headingFieldKey="olive.homepage.band-heading"
            bodyFieldKey="olive.homepage.band-body"
            ctaLabelFieldKey="olive.homepage.band-cta-label"
          />
        ) : null}

        {/* 4 · Shop by occasion */}
        {showCategories ? (
          <OliveCategorySection
            heading={f["olive.homepage.categories-heading"] ?? ""}
            entries={categoryEntries}
            sectionAttrs={sectionGroupAttr("homepage", "categories")}
            headingFieldKey="olive.homepage.categories-heading"
          />
        ) : null}

        {/* 5 · Collection takeover */}
        {isSectionVisible(customFields, "olive", "homepage.promo") ? (
          <OlivePromoSection
            takeover={f["olive.homepage.promo-takeover"] === "true"}
            image={f["olive.homepage.promo-image"] ?? ""}
            eyebrow={f["olive.homepage.promo-eyebrow"] ?? ""}
            heading={f["olive.homepage.promo-heading"] ?? ""}
            body={f["olive.homepage.promo-body"] ?? ""}
            buttonLabel={f["olive.homepage.promo-button-label"] ?? ""}
            buttonLink={promoButtonHref}
            tone="sand"
            id="olive-promo-homepage"
            sectionAttrs={sectionGroupAttr("homepage", "promo")}
            eyebrowField="olive.homepage.promo-eyebrow"
            headingFieldKey="olive.homepage.promo-heading"
            bodyFieldKey="olive.homepage.promo-body"
            buttonLabelFieldKey="olive.homepage.promo-button-label"
          />
        ) : null}

        {/* 6 · About split */}
        {isSectionVisible(customFields, "olive", "homepage.story") ? (
          <OliveStorySection
            eyebrow={f["olive.homepage.story-eyebrow"] ?? ""}
            heading={f["olive.homepage.story-heading"] ?? ""}
            body={f["olive.homepage.story-body"] ?? ""}
            buttonLabel={f["olive.homepage.story-button-label"] ?? ""}
            buttonHref={storyButtonHref}
            image={f["olive.homepage.story-image"] ?? ""}
            sectionAttrs={sectionGroupAttr("homepage", "story")}
            eyebrowFieldKey="olive.homepage.story-eyebrow"
            headingFieldKey="olive.homepage.story-heading"
            bodyFieldKey="olive.homepage.story-body"
            buttonLabelFieldKey="olive.homepage.story-button-label"
          />
        ) : null}

        {/* 7 · Two photo tiles */}
        {isSectionVisible(customFields, "olive", "homepage.mood") ? (
          <OliveMoodSection
            first={{
              image: f["olive.homepage.mood-one-image"] ?? "",
              label: f["olive.homepage.mood-one-label"] ?? "",
              href: moodOneHref,
              labelFieldKey: "olive.homepage.mood-one-label",
            }}
            second={{
              image: f["olive.homepage.mood-two-image"] ?? "",
              label: f["olive.homepage.mood-two-label"] ?? "",
              href: moodTwoHref,
              labelFieldKey: "olive.homepage.mood-two-label",
            }}
            sectionAttrs={sectionGroupAttr("homepage", "mood")}
          />
        ) : null}

        {/* 8 · Customer quote */}
        {showTestimonial && testimonial ? (
          <OliveTestimonialSection
            quote={testimonial.text}
            author={testimonial.customerName}
            linkLabel={f["olive.homepage.testimonial-link-label"] ?? ""}
            linkHref={testimonialLinkHref}
            sectionAttrs={sectionGroupAttr("homepage", "testimonial")}
            linkLabelFieldKey="olive.homepage.testimonial-link-label"
          />
        ) : null}

        {/* 9 · Feed */}
        {showFeed ? (
          <OliveFeedSection
            heading={f["olive.homepage.feed-heading"] ?? ""}
            handle={f["olive.homepage.feed-handle"] ?? ""}
            profileUrl={f["olive.homepage.feed-url"] ?? ""}
            images={feedImages}
            sectionAttrs={sectionGroupAttr("homepage", "feed")}
            headingFieldKey="olive.homepage.feed-heading"
            handleFieldKey="olive.homepage.feed-handle"
          />
        ) : null}

        {/* 10 · Press (hidden by default) */}
        {showPress ? (
          <OlivePressSection
            heading={f["olive.homepage.press-heading"] ?? ""}
            logos={pressLogos}
            sectionAttrs={sectionGroupAttr("homepage", "press")}
            headingFieldKey="olive.homepage.press-heading"
          />
        ) : null}

        {/* 11 · Journal */}
        {showBlog ? (
          <OliveBlogSection
            heading={f["olive.homepage.blog-heading"] ?? ""}
            linkLabel={f["olive.homepage.blog-link-label"] ?? ""}
            linkHref={blogLinkHref}
            posts={blogPosts}
            sectionAttrs={sectionGroupAttr("homepage", "blog")}
            headingFieldKey="olive.homepage.blog-heading"
            linkLabelFieldKey="olive.homepage.blog-link-label"
          />
        ) : null}

        {/* 12 · The Inner Circle (Email marketing on only) */}
        {showNewsletter ? (
          <OliveNewsletterSection
            eyebrow={f["olive.homepage.newsletter-eyebrow"] ?? ""}
            heading={f["olive.homepage.newsletter-heading"] ?? ""}
            body={f["olive.homepage.newsletter-body"] ?? ""}
            buttonLabel={f["olive.homepage.newsletter-button-label"] ?? ""}
            image={f["olive.homepage.newsletter-image"] ?? ""}
            privacyHref={resolvePrivacyHref(policyPages)}
            sectionAttrs={sectionGroupAttr("homepage", "newsletter")}
            eyebrowFieldKey="olive.homepage.newsletter-eyebrow"
            headingFieldKey="olive.homepage.newsletter-heading"
            bodyFieldKey="olive.homepage.newsletter-body"
            buttonLabelFieldKey="olive.homepage.newsletter-button-label"
          />
        ) : null}
      </div>
    </HydrateClient>
  );
}
