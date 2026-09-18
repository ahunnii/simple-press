import type { DefaultTestimonialsPageTemplateProps } from "../../types";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { api } from "~/trpc/server";

import { resolveFields } from "..";
import { DreamPageHero } from "../shared/dream-page-hero";
import { DreamTestimonialsCta } from "./dream-testimonials-cta";
import { DreamTestimonialsFeatured } from "./dream-testimonials-featured";

const FIELD_KEYS = [
  "dream.testimonials.hero-heading",
  "dream.testimonials.hero-accent",
  "dream.testimonials.hero-lede",
  "dream.testimonials.hero-empty-message",
  "dream.testimonials.featured-empty-cta-label",
  "dream.testimonials.cta-heading",
  "dream.testimonials.cta-body",
  "dream.testimonials.cta-button-label",
];

/**
 * "Kind words" — design.md "Per-page section concepts › Testimonials".
 * Approved testimonials are fetched server-side (`api.testimonial.list`) —
 * never hardcoded — and rendered as a featured pull-quote + masonry, with a
 * designed empty state when there are none yet.
 */
export async function DreamTestimonialsPage({
  business,
}: DefaultTestimonialsPageTemplateProps) {
  const testimonials = await api.testimonial.list({ publicOnly: true });

  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;
  const f = resolveFields(customFields, FIELD_KEYS);

  const businessName = business.name ?? "";
  const logoUrl =
    business.siteContent?.logoUrl ?? "/templates/dream/images/logo.webp";
  const logoAlt = resolveLogoAlt(
    business.siteContent?.logoAltText,
    businessName,
  );

  return (
    <div>
      <DreamPageHero
        logoUrl={logoUrl}
        logoAlt={logoAlt}
        title={f["dream.testimonials.hero-heading"] ?? ""}
        accent={f["dream.testimonials.hero-accent"] ?? ""}
        lede={f["dream.testimonials.hero-lede"] ?? ""}
        titleFieldKey="dream.testimonials.hero-heading"
        accentFieldKey="dream.testimonials.hero-accent"
        ledeFieldKey="dream.testimonials.hero-lede"
        sectionAttrs={sectionGroupAttr("testimonials", "hero")}
      />

      <DreamTestimonialsFeatured
        testimonials={testimonials}
        emptyMessage={f["dream.testimonials.hero-empty-message"] ?? ""}
        emptyCtaLabel={f["dream.testimonials.featured-empty-cta-label"] ?? ""}
      />

      {isSectionVisible(customFields, "dream", "testimonials.cta") && (
        <DreamTestimonialsCta
          heading={f["dream.testimonials.cta-heading"] ?? ""}
          body={f["dream.testimonials.cta-body"] ?? ""}
          buttonLabel={f["dream.testimonials.cta-button-label"] ?? ""}
        />
      )}
    </div>
  );
}
