import type { DefaultHomepageTemplateProps } from "../../types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { resolvePopup } from "~/lib/site-banner/resolve";
import {
  parseTemplateIframeValue,
  parseTemplateListRows,
} from "~/lib/template-fields";
import { db } from "~/server/db";
import { api, HydrateClient } from "~/trpc/server";
import { EmbedFrame } from "~/components/embed-frame";
import { InstagramEmbed } from "~/components/instagram-embed";
import { PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import { ViiBlogSection } from "./vii-blog-section";
import { ViiBrandsSection } from "./vii-brands-section";
import { ViiCategorySection } from "./vii-category-section";
import { ViiContactCtaSection } from "./vii-contact-cta-section";
import { ViiDetroitSection } from "./vii-detroit-section";
import { ViiHeroSection } from "./vii-hero-section";
import { ViiImageBand } from "./vii-image-band";
import { ViiInstagramStrip } from "./vii-instagram-strip";
import { ViiPopup } from "./vii-popup";
import { ViiProductRail } from "./vii-product-rail";
import { ViiStorySection } from "./vii-story-section";
import { ViiTestimonialQuote } from "./vii-testimonial-quote";
import { ViiVideoFeature } from "./vii-video-feature";

export async function ViiHomepage(props?: DefaultHomepageTemplateProps) {
  const [homepage, { isEnabled }] = await Promise.all([
    api.business.getHomepage(),
    getBusinessFlags(),
  ]);

  const popup = resolvePopup(props?.business?.siteContent, isEnabled("popups"));

  // Blog posts for the journal section. `getBlogPages` is gated behind the
  // "blog" feature flag, so when it's disabled the catch yields an empty array
  // and the section renders nothing.
  const blogPages = await api.content.getBlogPages().catch(() => []);
  const blogPosts = blogPages.map((page) => ({
    id: page.id,
    title: page.title,
    slug: page.slug,
    excerpt: page.excerpt ?? "",
    image: page.image ?? "",
  }));

  // Testimonial for the quote section. Fails gracefully when the feature is
  // disabled or there are no approved reviews yet.
  const testimonials = await api.testimonial
    .listRandom({ limit: 1 })
    .catch(() => []);
  const latestTestimonial = testimonials[0] ?? null;

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
    // Categories
    "vii.homepage.categories-overline",
    "vii.homepage.categories-heading",
    // Video feature
    "vii.homepage.video-overline",
    "vii.homepage.video-heading",
    "vii.homepage.video-heading-accent",
    "vii.homepage.video-body",
    "vii.homepage.video-file",
    "vii.homepage.video-poster",
    "vii.homepage.video-cta-text",
    "vii.homepage.video-cta-link",
    // Image Band
    "vii.homepage.band-image",
    // Inside the Studio (Story)
    "vii.homepage.story-heading",
    "vii.homepage.story-heading-accent",
    "vii.homepage.story-intro",
    // Product rail
    "vii.homepage.product-rail-overline",
    "vii.homepage.product-rail-heading",
    "vii.homepage.product-rail-collection",
    "vii.homepage.product-rail-cta-text",
    "vii.homepage.product-rail-cta-link",
    // Testimonial
    "vii.homepage.testimonial-image",
    "vii.homepage.testimonial-quote",
    "vii.homepage.testimonial-author",
    // Brands
    "vii.homepage.brands-overline",
    "vii.homepage.brands-heading",
    // Blog
    "vii.homepage.blog-heading",
    "vii.homepage.blog-heading-accent",
    "vii.homepage.blog-intro",
    "vii.homepage.blog-cta-text",
    "vii.homepage.blog-cta-link",
    // Detroit / Location
    "vii.homepage.detroit-overline",
    "vii.homepage.detroit-heading",
    "vii.homepage.detroit-heading-accent",
    "vii.homepage.detroit-body",
    "vii.homepage.detroit-image",
    "vii.homepage.detroit-cta-text",
    "vii.homepage.detroit-cta-link",
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
    "vii.homepage.instagram-feed-url",
    "vii.homepage.instagram-feed-width",
    "vii.homepage.instagram-feed-align",
    "vii.homepage.instagram-feed-frame",
    "vii.homepage.instagram-feed-bg",
  ]);

  // ── Parse list fields from raw customFields ───────────────────────────────
  const categoryCards = parseTemplateListRows(
    customFields?.["vii.homepage.categories-cards"],
  );
  const storyCards = parseTemplateListRows(
    customFields?.["vii.homepage.story-cards"],
  );
  const brandLogos = parseTemplateListRows(
    customFields?.["vii.homepage.brands-logos"],
  );
  const detroitDetails = parseTemplateListRows(
    customFields?.["vii.homepage.detroit-details"],
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
  const instagramGallery = instagramGalleryId?.trim()
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

  // ── Testimonial resolution (manual override wins; fallback to DB) ─────────
  const testimonialQuote =
    (f["vii.homepage.testimonial-quote"]?.trim()
      ? f["vii.homepage.testimonial-quote"]
      : latestTestimonial?.text) ?? "";
  const testimonialAuthor =
    (f["vii.homepage.testimonial-quote"]?.trim()
      ? f["vii.homepage.testimonial-author"]
      : latestTestimonial?.customerName) ?? "";

  return (
    <HydrateClient>
      {popup && <ViiPopup popup={popup} />}
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

        {/* 2. Categories */}
        <ViiCategorySection
          overline={f["vii.homepage.categories-overline"] ?? ""}
          heading={f["vii.homepage.categories-heading"] ?? ""}
          cards={categoryCards}
        />

        {/* 4. Text + Video */}
        <ViiVideoFeature
          overline={f["vii.homepage.video-overline"] ?? ""}
          heading={f["vii.homepage.video-heading"] ?? ""}
          headingAccent={f["vii.homepage.video-heading-accent"] ?? ""}
          body={f["vii.homepage.video-body"] ?? ""}
          videoSrc={f["vii.homepage.video-file"] ?? undefined}
          posterSrc={f["vii.homepage.video-poster"] ?? undefined}
          ctaText={f["vii.homepage.video-cta-text"] ?? ""}
          ctaHref={f["vii.homepage.video-cta-link"] ?? "/about"}
        />

        {/* 5. Image Band */}
        <ViiImageBand bandImage={f["vii.homepage.band-image"] ?? undefined} />

        {/* 6. Inside the Studio */}
        {storyCards.length > 0 ? (
          <ViiStorySection
            heading={f["vii.homepage.story-heading"] ?? ""}
            headingAccent={f["vii.homepage.story-heading-accent"] ?? ""}
            intro={f["vii.homepage.story-intro"] ?? ""}
            cards={storyCards}
          />
        ) : null}

        {/* 7. Product Rail */}
        <ViiProductRail
          overline={f["vii.homepage.product-rail-overline"] ?? ""}
          heading={f["vii.homepage.product-rail-heading"] ?? ""}
          ctaText={f["vii.homepage.product-rail-cta-text"] ?? "Shop All"}
          ctaHref={railCtaHref}
          products={railProducts}
        />

        {/* 8. Testimonial Quote */}
        {testimonialQuote ? (
          <ViiTestimonialQuote
            quoteImage={f["vii.homepage.testimonial-image"] ?? undefined}
            quoteText={testimonialQuote}
            quoteAuthor={testimonialAuthor}
          />
        ) : null}

        {/* 9. Brands We Carry */}
        <ViiBrandsSection
          overline={f["vii.homepage.brands-overline"] ?? ""}
          heading={f["vii.homepage.brands-heading"] ?? ""}
          logos={brandLogos}
        />

        {/* 10. Blog / Journal */}
        <ViiBlogSection
          heading={f["vii.homepage.blog-heading"] ?? ""}
          headingAccent={f["vii.homepage.blog-heading-accent"] ?? ""}
          intro={f["vii.homepage.blog-intro"] ?? ""}
          ctaText={f["vii.homepage.blog-cta-text"] ?? "Read the journal"}
          ctaHref={f["vii.homepage.blog-cta-link"] ?? "/blog"}
          posts={blogPosts}
        />

        {/* 11. Instagram Strip */}
        <ViiInstagramStrip
          handle={f["vii.homepage.instagram-handle"] ?? ""}
          images={instagramImages}
        />

        {/* 12. Rooted in Detroit */}
        <ViiDetroitSection
          overline={f["vii.homepage.detroit-overline"] ?? ""}
          heading={f["vii.homepage.detroit-heading"] ?? ""}
          headingAccent={f["vii.homepage.detroit-heading-accent"] ?? ""}
          body={f["vii.homepage.detroit-body"] ?? ""}
          image={f["vii.homepage.detroit-image"] ?? undefined}
          details={detroitDetails}
          ctaText={f["vii.homepage.detroit-cta-text"] ?? ""}
          ctaHref={f["vii.homepage.detroit-cta-link"] ?? "/contact"}
        />

        {/* 13. Contact CTA */}
        <ViiContactCtaSection
          contactImage={f["vii.homepage.contact-image"] ?? undefined}
          heading={f["vii.homepage.contact-heading"] ?? ""}
          subheading={f["vii.homepage.contact-subheading"] ?? ""}
          body={f["vii.homepage.contact-body"] ?? ""}
          phone={f["vii.homepage.contact-phone"] ?? ""}
          email={f["vii.homepage.contact-email"] ?? ""}
        />
      </PageTransition>
    </HydrateClient>
  );
}
