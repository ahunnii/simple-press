import Link from "next/link";

import type { DefaultTestimonialsPageTemplateProps } from "../../types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { api } from "~/trpc/server";
import { FadeIn, PageTransition } from "~/components/page-animations";

import { resolveFields } from "../index";
import { SledgeProductRail } from "../shared/sledge-product-rail";
import { SledgeTestimonialCard } from "../shared/sledge-testimonial-card";

type Testimonial = Awaited<ReturnType<typeof api.testimonial.list>>[number];

function formatAttribution(t: Testimonial): string {
  const name = t.customerName.trim();
  const location = (t.customerTitle ?? t.customerCompany ?? "").trim();
  if (name && location) return `${name}, ${location}`;
  return name || location;
}

export async function SledgeTestimonialsPage({
  business,
}: DefaultTestimonialsPageTemplateProps) {
  const [testimonials, homepage] = await Promise.all([
    api.testimonial.list({ publicOnly: true }),
    api.business.getHomepage(),
  ]);

  const customFields = business.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  const f = resolveFields(customFields, [
    "sledge.testimonials.page-heading",
    "sledge.testimonials.page-intro",
    "sledge.testimonials.trending-heading",
    "sledge.testimonials.empty-state-text",
    "sledge.global.shop-cta-text",
    "sledge.global.shop-cta-link",
  ]);

  const heading = f["sledge.testimonials.page-heading"];
  const pageIntro = f["sledge.testimonials.page-intro"];
  const trendingHeading = f["sledge.testimonials.trending-heading"];
  const emptyStateText = f["sledge.testimonials.empty-state-text"];
  const shopCtaText = f["sledge.global.shop-cta-text"];
  const shopCtaHref = f["sledge.global.shop-cta-link"];

  const products = homepage?.products ?? [];

  return (
    <PageTransition>
      <section
        className="px-7 pt-16 pb-10 md:pt-20 md:pb-12"
        {...sectionGroupAttr("testimonials", "header")}
      >
        <FadeIn className="mx-auto max-w-7xl">
          <h1 className="sl-page-title-lg font-heading font-semibold uppercase">
            {heading}
          </h1>
          <p className="sl-eyebrow mt-5 font-sans text-sm leading-relaxed md:text-base">
            {pageIntro}
          </p>
        </FadeIn>
      </section>

      <section
        className="px-7 pb-16 md:pb-20"
        {...sectionGroupAttr("testimonials", "list")}
      >
        <div className="mx-auto max-w-7xl">
          {testimonials.length === 0 ? (
            <FadeIn className="py-16 text-center">
              <p className="sl-eyebrow font-sans text-base">{emptyStateText}</p>
              <Link
                href="/"
                className="mt-6 inline-block font-sans text-xs tracking-[0.2em] text-(--sl-ink) uppercase transition-opacity hover:opacity-60"
              >
                Back to home
              </Link>
            </FadeIn>
          ) : (
            <div className="flex flex-col gap-8 md:gap-10">
              {testimonials.map((t) => (
                <FadeIn key={t.id}>
                  <SledgeTestimonialCard
                    label={t.title?.trim() ?? undefined}
                    quote={t.text.trim()}
                    attribution={formatAttribution(t) ?? undefined}
                  />
                </FadeIn>
              ))}
            </div>
          )}
        </div>
      </section>

      <SledgeProductRail
        heading={trendingHeading ?? ""}
        ctaText={shopCtaText ?? ""}
        ctaHref={shopCtaHref ?? ""}
        products={products}
        sectionAttrs={sectionGroupAttr("testimonials", "products")}
      />
    </PageTransition>
  );
}
