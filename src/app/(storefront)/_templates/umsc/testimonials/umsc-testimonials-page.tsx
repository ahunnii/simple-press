import type { DefaultTestimonialsPageTemplateProps } from "../../types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { api } from "~/trpc/server";
import { PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import { UmscPageHero } from "../shared/umsc-page-hero";
import { UmscTestimonialsCta } from "./umsc-testimonials-cta";
import { UmscTestimonialsFeatured } from "./umsc-testimonials-featured";

const FIELD_KEYS = [
  "umsc.testimonials.hero-heading",
  "umsc.testimonials.hero-lede",
  "umsc.testimonials.empty-message",
  "umsc.testimonials.review-source-label",
  "umsc.testimonials.cta-heading",
  "umsc.testimonials.cta-body",
  "umsc.testimonials.cta-button-label",
  "umsc.global.google-review-url",
];

export async function UmscTestimonialsPage({
  business,
}: DefaultTestimonialsPageTemplateProps) {
  const testimonials = await api.testimonial.list({ publicOnly: true });

  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;
  const f = resolveFields(customFields, FIELD_KEYS);

  return (
    <PageTransition>
      <UmscPageHero
        heading={f["umsc.testimonials.hero-heading"] ?? ""}
        headingFieldKey="umsc.testimonials.hero-heading"
        lede={f["umsc.testimonials.hero-lede"] ?? ""}
        ledeFieldKey="umsc.testimonials.hero-lede"
        sectionAttrs={sectionGroupAttr("testimonials", "hero")}
      />

      <UmscTestimonialsFeatured
        testimonials={testimonials}
        sourceLabel={f["umsc.testimonials.review-source-label"] ?? ""}
        emptyMessage={f["umsc.testimonials.empty-message"] ?? ""}
      />

      {isSectionVisible(customFields, "umsc", "testimonials.cta") && (
        <UmscTestimonialsCta
          heading={f["umsc.testimonials.cta-heading"] ?? ""}
          body={f["umsc.testimonials.cta-body"] ?? ""}
          buttonLabel={f["umsc.testimonials.cta-button-label"] ?? ""}
          googleReviewUrl={f["umsc.global.google-review-url"] ?? ""}
        />
      )}
    </PageTransition>
  );
}
