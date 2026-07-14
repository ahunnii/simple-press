import type { DefaultHomepageTemplateProps } from "../../types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { resolvePopup } from "~/lib/site-banner/resolve";
import { isSectionVisible } from "~/lib/sp-meta";
import { parseTemplateListRows } from "~/lib/template-fields";
import { db } from "~/server/db";
import { api, HydrateClient } from "~/trpc/server";
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
import { ViiTestimonialQuote } from "./vii-testimonial-quote";
import { ViiVideoFeature } from "./vii-video-feature";

export async function ViiHomepage(props?: DefaultHomepageTemplateProps) {
  const [homepage, { isEnabled }] = await Promise.all([
    api.business.getHomepage(),
    getBusinessFlags(),
  ]);

  const popup = resolvePopup(props?.business?.siteContent, isEnabled("popups"));

  // Blog posts for the blog section. `getBlogPages` is gated behind the
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
    "vii.homepage.video-aspect",
    // Image Band
    "vii.homepage.band-image",
    "vii.homepage.band-heading",
    "vii.homepage.band-text",
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
    "vii.homepage.contact-cta-text",
    "vii.homepage.contact-cta-link",
    "vii.homepage.contact-show-phone",
    "vii.homepage.contact-show-email",
    // Instagram
    "vii.homepage.instagram-handle",
    "vii.homepage.instagram-cta-text",
    "vii.homepage.instagram-gallery",
  ]);

  // ── Parse list fields from raw customFields ───────────────────────────────
  const categoryCards = parseTemplateListRows(
    customFields?.["vii.homepage.categories-cards"],
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
          aspectRatio={f["vii.homepage.video-aspect"]}
        />

        {/* 5. Image Band */}
        <ViiImageBand
          bandImage={f["vii.homepage.band-image"] ?? undefined}
          bandHeading={f["vii.homepage.band-heading"] ?? ""}
          bandText={f["vii.homepage.band-text"] ?? ""}
        />

        {/* 7. Product Rail */}
        <ViiProductRail
          overline={f["vii.homepage.product-rail-overline"] ?? ""}
          heading={f["vii.homepage.product-rail-heading"] ?? ""}
          ctaText={f["vii.homepage.product-rail-cta-text"] ?? "Shop All"}
          ctaHref={railCtaHref}
          products={railProducts}
        />

        {/* 8. Testimonial Quote */}
        {testimonialQuote &&
        isSectionVisible(customFields, "vii", "homepage.testimonial") ? (
          <ViiTestimonialQuote
            quoteImage={f["vii.homepage.testimonial-image"] ?? undefined}
            quoteText={testimonialQuote}
            quoteAuthor={testimonialAuthor}
          />
        ) : null}

        {/* 9. Brands We Carry */}
        {isSectionVisible(customFields, "vii", "homepage.brands") && (
          <ViiBrandsSection
            marquee
            overline={f["vii.homepage.brands-overline"] ?? ""}
            heading={f["vii.homepage.brands-heading"] ?? ""}
            logos={brandLogos}
            sectionAttrs={sectionGroupAttr("homepage", "brands")}
            overlineFieldKey="vii.homepage.brands-overline"
            headingFieldKey="vii.homepage.brands-heading"
          />
        )}

        {/* 10. Blog */}
        {isSectionVisible(customFields, "vii", "homepage.blog") && (
          <ViiBlogSection
            heading={f["vii.homepage.blog-heading"] ?? ""}
            headingAccent={f["vii.homepage.blog-heading-accent"] ?? ""}
            intro={f["vii.homepage.blog-intro"] ?? ""}
            ctaText={f["vii.homepage.blog-cta-text"] ?? "Read the blog"}
            ctaHref={f["vii.homepage.blog-cta-link"] ?? "/blog"}
            posts={blogPosts}
          />
        )}

        {/* 11. Instagram Strip */}
        {isSectionVisible(customFields, "vii", "homepage.instagram") && (
          <ViiInstagramStrip
            handle={f["vii.homepage.instagram-handle"] ?? ""}
            images={instagramImages}
            ctaText={
              f["vii.homepage.instagram-cta-text"] ?? "Follow on Instagram"
            }
          />
        )}

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
        {isSectionVisible(customFields, "vii", "homepage.contact") && (
          <ViiContactCtaSection
            contactImage={f["vii.homepage.contact-image"] ?? undefined}
            heading={f["vii.homepage.contact-heading"] ?? ""}
            subheading={f["vii.homepage.contact-subheading"] ?? ""}
            body={f["vii.homepage.contact-body"] ?? ""}
            phone={homepage?.phoneNumber ?? ""}
            email={homepage?.supportEmail ?? ""}
            buttonLabel={f["vii.homepage.contact-cta-text"] ?? ""}
            buttonHref={f["vii.homepage.contact-cta-link"] ?? ""}
            showPhone={f["vii.homepage.contact-show-phone"] !== "false"}
            showEmail={f["vii.homepage.contact-show-email"] !== "false"}
            sectionAttrs={sectionGroupAttr("homepage", "contact")}
            headingFieldKey="vii.homepage.contact-heading"
            subheadingFieldKey="vii.homepage.contact-subheading"
            bodyFieldKey="vii.homepage.contact-body"
            buttonLabelFieldKey="vii.homepage.contact-cta-text"
          />
        )}
      </PageTransition>
    </HydrateClient>
  );
}
