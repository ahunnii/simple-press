import Image from "next/image";
import Link from "next/link";

import type { DefaultHomepageTemplateProps } from "../../types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { resolvePopup } from "~/lib/site-banner/resolve";
import { isSectionVisible } from "~/lib/sp-meta";
import { getRawCustomFieldString } from "~/lib/template-fields";
import { api, HydrateClient } from "~/trpc/server";
import { PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import { DefaultParallaxHero } from "./default-parallax-hero";
import { DefaultPopup } from "./default-popup";
import { DefaultProductRail } from "./default-product-rail";

/*
 * Preview annotation pattern for the default template:
 * Each major section's outermost element carries a `data-sp-group` attribute
 * matching the TemplateFieldGroup.id for that section (e.g. "homepage.hero").
 * The admin preview overlay uses these to enable hover/click-to-edit hotspots.
 * Inline sections get the attribute directly; sub-components (DefaultParallaxHero,
 * DefaultProductRail) accept an optional `sectionAttrs` prop for passthrough.
 * To annotate another template, replicate this pattern using sectionGroupAttr().
 */

export async function DefaultHomePage({
  business,
}: DefaultHomepageTemplateProps) {
  const [homepage, { isEnabled }] = await Promise.all([
    api.business.getHomepage(),
    getBusinessFlags(),
  ]);

  const popup = resolvePopup(business?.siteContent, isEnabled);
  const products = homepage?.products ?? [];
  const customFields = business?.siteContent?.customFields;

  const f = resolveFields(customFields, [
    "default.homepage.hero-eyebrow",
    "default.homepage.hero-image",
    "default.homepage.hero-description",
    "default.homepage.hero-button-text",
    "default.homepage.hero-button-link",
    "default.homepage.hero-button-2-text",
    "default.homepage.hero-button-2-link",
    "default.homepage.collections-eyebrow",
    "default.homepage.collections-heading",
    "default.homepage.collections-cta-text",
    "default.homepage.collections-cta-link",
    "default.homepage.rail-one-collection",
    "default.homepage.rail-one-eyebrow",
    "default.homepage.rail-one-title",
    "default.homepage.rail-one-button-text",
    "default.homepage.rail-one-button-link",
    "default.homepage.rail-two-collection",
    "default.homepage.rail-two-eyebrow",
    "default.homepage.rail-two-title",
    "default.homepage.rail-two-button-text",
    "default.homepage.rail-two-button-link",
    "default.homepage.cta-eyebrow",
    "default.homepage.cta-heading",
    "default.homepage.cta-description",
    "default.homepage.cta-image",
    "default.homepage.cta-button-text",
    "default.homepage.cta-button-link",
    "default.homepage.testimonial-cta-text",
    "default.homepage.testimonial-cta-link",
    "default.homepage.promise-1-title",
    "default.homepage.promise-1-desc",
    "default.homepage.promise-2-title",
    "default.homepage.promise-2-desc",
    "default.homepage.promise-3-title",
    "default.homepage.promise-3-desc",
    "default.homepage.promise-4-title",
    "default.homepage.promise-4-desc",
  ]);

  const rail1Id = f["default.homepage.rail-one-collection"] ?? "";
  const rail2Id = f["default.homepage.rail-two-collection"] ?? "";

  const [rail1Data, rail2Data, collectionsData, testimonials] =
    await Promise.all([
      rail1Id
        ? api.collections.getProductsByCollectionId(rail1Id)
        : Promise.resolve(null),
      rail2Id
        ? api.collections.getProductsByCollectionId(rail2Id)
        : Promise.resolve(null),
      api.collections
        .getAllPublic()
        .catch(
          () =>
            [] as Awaited<ReturnType<typeof api.collections.getAllPublic>>,
        ),
      isEnabled("testimonials")
        ? api.testimonial
            .list({ publicOnly: true })
            .catch(() => [] as Awaited<ReturnType<typeof api.testimonial.list>>)
        : Promise.resolve(
            [] as Awaited<ReturnType<typeof api.testimonial.list>>,
          ),
    ]);

  const railOneProducts = rail1Data?.products ?? products.slice(0, 4);
  const railTwoProducts = rail2Data?.products ?? products.slice(4, 8);

  const railOneCtaHref = rail1Data
    ? `/collections/${rail1Data.collection.slug}`
    : (f["default.homepage.rail-one-button-link"] ?? "/shop");

  const railTwoCtaHref = rail2Data
    ? `/collections/${rail2Data.collection.slug}`
    : (f["default.homepage.rail-two-button-link"] ?? "/shop");

  const topCollections = collectionsData.slice(0, 3);

  const storyHeading = f["default.homepage.cta-heading"];
  const storyDescription = f["default.homepage.cta-description"];
  const storyImage = f["default.homepage.cta-image"] ?? "/placeholder.svg";

  // ── Testimonial: latest Admin → Testimonials entry, falling back to a
  // legacy saved quote/author (the `testimonial-quote`/`testimonial-author`
  // fields were retired 2026-09-27 — see homepage/index.ts). Never a
  // template-owned quote per field-conventions.md "Never duplicate Settings
  // data" — testimonials are owned by Admin → Testimonials.
  const featuredTestimonial = testimonials[0];
  const legacyTestimonialQuote = getRawCustomFieldString(
    customFields,
    "default.homepage.testimonial-quote",
  )?.trim();
  const legacyTestimonialAuthor = getRawCustomFieldString(
    customFields,
    "default.homepage.testimonial-author",
  )?.trim();
  const testimonialQuote =
    featuredTestimonial?.text ??
    (legacyTestimonialQuote && legacyTestimonialQuote.length > 0
      ? legacyTestimonialQuote
      : undefined);
  const testimonialAuthor = featuredTestimonial
    ? featuredTestimonial.customerName
    : legacyTestimonialAuthor && legacyTestimonialAuthor.length > 0
      ? legacyTestimonialAuthor
      : undefined;

  return (
    <HydrateClient>
      {popup && <DefaultPopup popup={popup} />}
      <PageTransition>
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <DefaultParallaxHero
          imageUrl={f["default.homepage.hero-image"] ?? "/placeholder.svg"}
          title={business.name}
          eyebrow={f["default.homepage.hero-eyebrow"]}
          description={f["default.homepage.hero-description"]}
          primaryText={
            f["default.homepage.hero-button-text"] ?? "Shop the catalog"
          }
          primaryHref={f["default.homepage.hero-button-link"] ?? "/shop"}
          secondaryText={f["default.homepage.hero-button-2-text"]}
          secondaryHref={f["default.homepage.hero-button-2-link"]}
          sectionAttrs={sectionGroupAttr("homepage", "hero")}
          eyebrowAttrs={fieldAttr("default.homepage.hero-eyebrow")}
          descriptionAttrs={fieldAttr("default.homepage.hero-description")}
          primaryTextAttrs={fieldAttr("default.homepage.hero-button-text")}
          secondaryTextAttrs={fieldAttr("default.homepage.hero-button-2-text")}
        />

        {/* ── Collections ──────────────────────────────────────────────── */}
        {topCollections.length > 0 &&
          isSectionVisible(customFields, "default", "homepage.collections") && (
            <section
              className="px-6 py-24 lg:px-8"
              {...sectionGroupAttr("homepage", "collections")}
            >
              <div className="mx-auto max-w-[1440px]">
                <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex flex-col gap-2">
                    {f["default.homepage.collections-eyebrow"] && (
                      <p
                        className="text-xs font-medium tracking-[0.14em] text-[#6b6b6b] uppercase"
                        {...fieldAttr("default.homepage.collections-eyebrow")}
                      >
                        {f["default.homepage.collections-eyebrow"]}
                      </p>
                    )}
                    <h2
                      className="font-serif text-3xl font-semibold tracking-tight md:text-4xl"
                      {...fieldAttr("default.homepage.collections-heading")}
                    >
                      {f["default.homepage.collections-heading"] ??
                        "Collections"}
                    </h2>
                  </div>
                  <Link
                    href={
                      f["default.homepage.collections-cta-link"] ??
                      "/collections"
                    }
                    className="inline-flex shrink-0 items-center gap-2 border-b border-current pb-0.5 text-sm font-medium transition-[gap] hover:gap-3"
                  >
                    <span
                      {...fieldAttr("default.homepage.collections-cta-text")}
                    >
                      {f["default.homepage.collections-cta-text"] ??
                        "View everything"}
                    </span>{" "}
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {topCollections.map((col, i) => (
                    <Link
                      key={col.id}
                      href={`/collections/${col.slug}`}
                      className="group block"
                    >
                      <div
                        className={`relative mb-4 aspect-3/4 overflow-hidden rounded-[var(--radius)] ${
                          i === 1
                            ? "bg-[#efece8]"
                            : i === 2
                              ? "bg-[#1a1a1a]"
                              : "bg-[#f6f6f6]"
                        }`}
                      >
                        {col.imageUrl ? (
                          <Image
                            src={col.imageUrl}
                            alt={col.name}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-[1.015]"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-medium tracking-[0.16em] text-[#6b6b6b] uppercase">
                              {col.name}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-serif text-[15px] font-medium tracking-[-0.005em] transition-opacity group-hover:opacity-70">
                          {col.name}
                        </span>
                        <span className="text-[14px] text-[#6b6b6b]">
                          {col._count.collectionProducts} items
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

        {/* ── Rail 1 — Featured Products ────────────────────────────────── */}
        {/* Carries the "homepage.rails" group hotspot — rail 2 below shares
            the same group (a group is annotated once) and is gated behind
            `railTwoProducts.length > 0`, so this always-attempted rail is the
            more reliable target for the editor. */}
        <DefaultProductRail
          eyebrow={f["default.homepage.rail-one-eyebrow"] ?? "Featured"}
          eyebrowAttrs={fieldAttr("default.homepage.rail-one-eyebrow")}
          title={
            rail1Data?.collection.name ??
            f["default.homepage.rail-one-title"] ??
            "This week's picks."
          }
          titleAttrs={
            rail1Data ? undefined : fieldAttr("default.homepage.rail-one-title")
          }
          description={rail1Data?.collection.description ?? undefined}
          ctaText={f["default.homepage.rail-one-button-text"] ?? "All products"}
          ctaTextAttrs={fieldAttr("default.homepage.rail-one-button-text")}
          ctaHref={railOneCtaHref}
          products={railOneProducts}
          sectionAttrs={sectionGroupAttr("homepage", "rails")}
        />

        {/* ── Story strip ───────────────────────────────────────────────── */}
        {(storyHeading ?? storyDescription) &&
          isSectionVisible(customFields, "default", "homepage.story") && (
            <section
              className="bg-[#efece8] px-6 py-24 lg:px-8"
              {...sectionGroupAttr("homepage", "story")}
            >
              <div className="mx-auto max-w-[1440px]">
                <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:items-center">
                  {/* Image */}
                  <div className="relative aspect-4/3 overflow-hidden rounded-[var(--radius)] bg-[#e0ddd8]">
                    <Image
                      src={storyImage}
                      alt={storyHeading ?? business.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Text */}
                  <div className="flex flex-col gap-6 lg:max-w-[480px]">
                    {f["default.homepage.cta-eyebrow"] && (
                      <span
                        className="text-xs font-medium tracking-[0.14em] text-[#6b6b6b] uppercase"
                        {...fieldAttr("default.homepage.cta-eyebrow")}
                      >
                        {f["default.homepage.cta-eyebrow"]}
                      </span>
                    )}
                    {storyHeading && (
                      <h2
                        className="font-serif text-3xl font-semibold tracking-tight text-balance md:text-4xl"
                        {...fieldAttr("default.homepage.cta-heading")}
                      >
                        {storyHeading}
                      </h2>
                    )}
                    {storyDescription && (
                      <p
                        className="text-[15px] leading-relaxed text-[#6b6b6b]"
                        {...fieldAttr("default.homepage.cta-description")}
                      >
                        {storyDescription}
                      </p>
                    )}
                    <Link
                      href={f["default.homepage.cta-button-link"] ?? "/about"}
                      className="inline-flex items-center gap-2 self-start border-b border-current pb-0.5 text-sm font-medium transition-[gap] hover:gap-3"
                    >
                      <span {...fieldAttr("default.homepage.cta-button-text")}>
                        {f["default.homepage.cta-button-text"] ?? "Read more"}
                      </span>{" "}
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          )}

        {/* ── Rail 2 — Customer favorites ───────────────────────────────── */}
        {/* No sectionAttrs — shares the "homepage.rails" group with rail 1
            above, which carries the hotspot (see its comment). */}
        {railTwoProducts.length > 0 && (
          <DefaultProductRail
            eyebrow={
              f["default.homepage.rail-two-eyebrow"] ?? "Customer favorites"
            }
            eyebrowAttrs={fieldAttr("default.homepage.rail-two-eyebrow")}
            title={
              rail2Data?.collection.name ??
              f["default.homepage.rail-two-title"] ??
              "What people keep reaching for."
            }
            titleAttrs={
              rail2Data
                ? undefined
                : fieldAttr("default.homepage.rail-two-title")
            }
            description={rail2Data?.collection.description ?? undefined}
            ctaText={
              f["default.homepage.rail-two-button-text"] ?? "Shop bestsellers"
            }
            ctaTextAttrs={fieldAttr("default.homepage.rail-two-button-text")}
            ctaHref={railTwoCtaHref}
            products={railTwoProducts}
          />
        )}

        {/* ── Testimonial preview ─────────────────────────────────────────
            Shows the latest Admin → Testimonials entry when the flag is on;
            falls back silently to a legacy saved quote/author, else hides.
            The quote/author never carry fieldAttr when sourced from Admin
            (they aren't fields); the legacy-fallback author still does,
            since that text IS still a saved field value. ── */}
        {isEnabled("testimonials") &&
          testimonialQuote &&
          isSectionVisible(customFields, "default", "homepage.testimonial") && (
            <section
              aria-label="Customer testimonial"
              className="px-6 py-24 lg:px-8"
              {...sectionGroupAttr("homepage", "testimonial")}
            >
              <div className="mx-auto max-w-[880px] text-center">
                <p className="text-[clamp(22px,2.8vw,34px)] leading-[1.28] tracking-[-0.015em] text-balance">
                  &ldquo;{testimonialQuote}&rdquo;
                </p>
                {testimonialAuthor && (
                  <p
                    className="mt-6 text-[13px] text-[#6b6b6b]"
                    {...(featuredTestimonial
                      ? {}
                      : fieldAttr("default.homepage.testimonial-author"))}
                  >
                    {testimonialAuthor}
                  </p>
                )}
                {f["default.homepage.testimonial-cta-text"] && (
                  <div className="mt-8">
                    <Link
                      href={
                        f["default.homepage.testimonial-cta-link"] ??
                        "/testimonials"
                      }
                      className="inline-flex items-center gap-2 border-b border-current pb-0.5 text-sm font-medium transition-[gap] hover:gap-3"
                    >
                      <span
                        {...fieldAttr("default.homepage.testimonial-cta-text")}
                      >
                        {f["default.homepage.testimonial-cta-text"]}
                      </span>{" "}
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                )}
              </div>
            </section>
          )}

        {/* ── Promise strip ─────────────────────────────────────────────── */}
        {isSectionVisible(customFields, "default", "homepage.promise") && (
          <div
            className="border-t border-b border-[#e8e8e8]"
            {...sectionGroupAttr("homepage", "promise")}
          >
            <div className="mx-auto grid max-w-[1440px] grid-cols-2 divide-x divide-y divide-[#e8e8e8] lg:grid-cols-4 lg:divide-y-0">
              {[
                {
                  title:
                    f["default.homepage.promise-1-title"] ?? "Secure checkout",
                  titleField: "default.homepage.promise-1-title",
                  desc:
                    f["default.homepage.promise-1-desc"] ??
                    "Payments are encrypted and processed securely.",
                  descField: "default.homepage.promise-1-desc",
                },
                {
                  title:
                    f["default.homepage.promise-2-title"] ?? "Delivery options",
                  titleField: "default.homepage.promise-2-title",
                  desc:
                    f["default.homepage.promise-2-desc"] ??
                    "See shipping costs and options at checkout.",
                  descField: "default.homepage.promise-2-desc",
                },
                {
                  title: f["default.homepage.promise-3-title"] ?? "Made with care",
                  titleField: "default.homepage.promise-3-title",
                  desc:
                    f["default.homepage.promise-3-desc"] ??
                    "Every order is packed with care.",
                  descField: "default.homepage.promise-3-desc",
                },
                {
                  title:
                    f["default.homepage.promise-4-title"] ?? "Personal service",
                  titleField: "default.homepage.promise-4-title",
                  desc:
                    f["default.homepage.promise-4-desc"] ??
                    "You'll always reach a real person.",
                  descField: "default.homepage.promise-4-desc",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex flex-col gap-1.5 px-6 py-8 lg:px-8"
                >
                  <h3
                    className="text-sm font-medium"
                    {...fieldAttr(item.titleField)}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="text-[13px] text-[#6b6b6b]"
                    {...fieldAttr(item.descField)}
                  >
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </PageTransition>
    </HydrateClient>
  );
}
