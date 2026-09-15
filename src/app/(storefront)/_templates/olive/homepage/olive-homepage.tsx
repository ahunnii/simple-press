import type { DefaultHomepageTemplateProps } from "../../types";
import type { OliveCardProduct } from "../shared";
import type { OliveBlogTeaser } from "./olive-blog-section";
import type { OliveCategoryEntry } from "./olive-category-section";
import type { OliveFeedImage } from "./olive-feed-section";
import type { OlivePressLogo } from "./olive-press-section";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { resolvePopup } from "~/lib/site-banner/resolve";
import { isSectionVisible } from "~/lib/sp-meta";
import { parseTemplateListRows } from "~/lib/template-fields";
import { formatDate } from "~/lib/utils";
import { api, HydrateClient } from "~/trpc/server";

import { resolveFields } from "..";
import { hasOliveImage } from "../shared";
import { OliveBandSection } from "./olive-band-section";
import { OliveBlogSection } from "./olive-blog-section";
import { OliveCategorySection } from "./olive-category-section";
import { OliveFeedSection } from "./olive-feed-section";
import { OliveHeroSection } from "./olive-hero-section";
import { OliveMoodSection } from "./olive-mood-section";
import { OlivePopup } from "./olive-popup";
import { OlivePressSection } from "./olive-press-section";
import { OliveProductRail } from "./olive-product-rail";
import { OliveTestimonialSection } from "./olive-testimonial-section";

type OliveCollections = Awaited<
  ReturnType<typeof api.collections.getAllPublic>
>;
type OliveRailProducts = Awaited<
  ReturnType<typeof api.product.getRailProducts>
>;
type OliveBlogPages = Awaited<ReturnType<typeof api.content.getBlogPages>>;
type OliveTestimonials = Awaited<ReturnType<typeof api.testimonial.listRandom>>;

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

/**
 * Olive Mode's homepage — the swatch book opened on the counter.
 *
 * Nine sections in the order design.md sets: the hero swatch card, the fanned
 * category cards, two big tiles, the swatch grid of new arrivals, the sage
 * cover band, the feed, the press strip, one customer quote, the journal.
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
  const popup = resolvePopup(business.siteContent, isEnabled("popups"));

  const f = resolveFields(customFields, [
    "olive.homepage.hero-image",
    "olive.homepage.hero-video",
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

  const railCollectionId = (f["olive.homepage.rail-collection"] ?? "").trim();
  const productsEnabled = isEnabled("products");

  // Every remote read is optional: each procedure is feature-gated and throws
  // when its flag is off, so a missing catch would take the whole homepage
  // down with it.
  const [collections, railCollection, latestProducts, blogPages, testimonials] =
    await Promise.all([
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
            .getRailProducts({ limit: 8 })
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
    }))
    .filter((entry) => entry.label.length > 0);

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
  const collectionProducts = railCollection?.products.slice(0, 8) ?? [];
  const showingCollection = collectionProducts.length > 0;
  const railProducts: OliveCardProduct[] = showingCollection
    ? collectionProducts
    : latestProducts;

  // ── Feed and press lists ──────────────────────────────────────────────────
  const feedImages: OliveFeedImage[] = parseTemplateListRows(
    customFields?.["olive.homepage.feed-images"],
  )
    .map((row, index) => ({
      id: typeof row._id === "string" ? row._id : `feed-${index}`,
      image: rowText(row, "image"),
      caption: rowText(row, "caption"),
    }))
    .filter((item) => hasOliveImage(item.image));

  const pressLogos: OlivePressLogo[] = parseTemplateListRows(
    customFields?.["olive.homepage.press-logos"],
  )
    .map((row, index) => ({
      id: typeof row._id === "string" ? row._id : `press-${index}`,
      image: rowText(row, "image"),
      name: rowText(row, "name"),
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

  return (
    <HydrateClient>
      {popup ? <OlivePopup popup={popup} /> : null}

      <>
        <OliveHeroSection
          image={f["olive.homepage.hero-image"] ?? "/placeholder.svg"}
          video={f["olive.homepage.hero-video"] ?? ""}
          heading={f["olive.homepage.hero-heading"] ?? ""}
          body={f["olive.homepage.hero-body"] ?? ""}
          ctaLabel={f["olive.homepage.hero-cta-label"] ?? ""}
          ctaHref={f["olive.homepage.hero-cta-link"] ?? "/shop"}
          sectionAttrs={sectionGroupAttr("homepage", "hero")}
          headingFieldKey="olive.homepage.hero-heading"
          bodyFieldKey="olive.homepage.hero-body"
          ctaLabelFieldKey="olive.homepage.hero-cta-label"
        />

        {showCategories ? (
          <OliveCategorySection
            heading={f["olive.homepage.categories-heading"] ?? ""}
            entries={categoryEntries}
            sectionAttrs={sectionGroupAttr("homepage", "categories")}
            headingFieldKey="olive.homepage.categories-heading"
          />
        ) : null}

        {isSectionVisible(customFields, "olive", "homepage.mood") ? (
          <OliveMoodSection
            first={{
              image: f["olive.homepage.mood-one-image"] ?? "/placeholder.svg",
              label: f["olive.homepage.mood-one-label"] ?? "",
              href: f["olive.homepage.mood-one-link"] ?? "/shop",
              labelFieldKey: "olive.homepage.mood-one-label",
            }}
            second={{
              image: f["olive.homepage.mood-two-image"] ?? "/placeholder.svg",
              label: f["olive.homepage.mood-two-label"] ?? "",
              href: f["olive.homepage.mood-two-link"] ?? "/blog",
              labelFieldKey: "olive.homepage.mood-two-label",
            }}
            sectionAttrs={sectionGroupAttr("homepage", "mood")}
          />
        ) : null}

        {productsEnabled ? (
          <OliveProductRail
            heading={f["olive.homepage.rail-heading"] ?? ""}
            linkLabel={f["olive.homepage.rail-link-label"] ?? ""}
            linkHref={
              showingCollection && railCollection
                ? `/collections/${railCollection.collection.slug}`
                : (f["olive.homepage.rail-link"] ?? "/shop")
            }
            products={railProducts}
            emptyHeading={f["olive.homepage.rail-empty-heading"] ?? ""}
            emptyBody={f["olive.homepage.rail-empty-body"] ?? ""}
            sectionAttrs={sectionGroupAttr("homepage", "productRail")}
            headingFieldKey="olive.homepage.rail-heading"
            linkLabelFieldKey="olive.homepage.rail-link-label"
          />
        ) : null}

        {isSectionVisible(customFields, "olive", "homepage.band") ? (
          <OliveBandSection
            heading={f["olive.homepage.band-heading"] ?? ""}
            body={f["olive.homepage.band-body"] ?? ""}
            ctaLabel={f["olive.homepage.band-cta-label"] ?? ""}
            ctaHref={f["olive.homepage.band-cta-link"] ?? "/about"}
            image={f["olive.homepage.band-image"] ?? "/placeholder.svg"}
            sectionAttrs={sectionGroupAttr("homepage", "band")}
            headingFieldKey="olive.homepage.band-heading"
            bodyFieldKey="olive.homepage.band-body"
            ctaLabelFieldKey="olive.homepage.band-cta-label"
          />
        ) : null}

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

        {showPress ? (
          <OlivePressSection
            heading={f["olive.homepage.press-heading"] ?? ""}
            logos={pressLogos}
            sectionAttrs={sectionGroupAttr("homepage", "press")}
            headingFieldKey="olive.homepage.press-heading"
          />
        ) : null}

        {showTestimonial && testimonial ? (
          <OliveTestimonialSection
            quote={testimonial.text}
            author={testimonial.customerName}
            linkLabel={f["olive.homepage.testimonial-link-label"] ?? ""}
            linkHref={f["olive.homepage.testimonial-link"] ?? "/testimonials"}
            sectionAttrs={sectionGroupAttr("homepage", "testimonial")}
            linkLabelFieldKey="olive.homepage.testimonial-link-label"
          />
        ) : null}

        {showBlog ? (
          <OliveBlogSection
            heading={f["olive.homepage.blog-heading"] ?? ""}
            linkLabel={f["olive.homepage.blog-link-label"] ?? ""}
            linkHref={f["olive.homepage.blog-link"] ?? "/blog"}
            posts={blogPosts}
            sectionAttrs={sectionGroupAttr("homepage", "blog")}
            headingFieldKey="olive.homepage.blog-heading"
            linkLabelFieldKey="olive.homepage.blog-link-label"
          />
        ) : null}
      </>
    </HydrateClient>
  );
}
