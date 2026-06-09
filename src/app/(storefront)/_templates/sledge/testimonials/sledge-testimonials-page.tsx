import Link from "next/link";

import type { DefaultTestimonialsPageTemplateProps } from "../../types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { api } from "~/trpc/server";
import { FadeIn, PageTransition } from "~/components/page-animations";

import { resolveFields } from "../index";
import {
  SledgeEmptyState,
  SledgePageHeader,
  SledgePageSection,
} from "../shared/sledge-page-layout";
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
      <SledgePageHeader
        title={heading ?? "Testimonials"}
        intro={pageIntro ?? undefined}
        sectionAttrs={sectionGroupAttr("testimonials", "header")}
      />

      <SledgePageSection
        sectionAttrs={sectionGroupAttr("testimonials", "list")}
      >
        {testimonials.length === 0 ? (
          <SledgeEmptyState
            bare
            className="py-16"
            message={emptyStateText ?? "No testimonials yet."}
            action={
              <Link
                href="/"
                className="inline-block font-sans text-xs tracking-[0.2em] text-(--sl-ink) uppercase transition-opacity hover:opacity-60"
              >
                Back to home
              </Link>
            }
          />
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
      </SledgePageSection>

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
