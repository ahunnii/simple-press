import type { DefaultTestimonialsPageTemplateProps } from "../../types";
import { PageTransition } from "~/components/page-animations";
import { api } from "~/trpc/server";

import { resolveFields } from "..";
import { ViiTestimonialsClient } from "./vii-testimonials-client";

export async function ViiTestimonialsPage({
  business,
}: DefaultTestimonialsPageTemplateProps) {
  const testimonials = await api.testimonial.list({ publicOnly: true });

  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields, [
    "vii.testimonials.overline",
    "vii.testimonials.heading",
    "vii.testimonials.heading-accent",
    "vii.testimonials.intro",
    "vii.testimonials.empty-message",
    "vii.testimonials.cta-heading",
    "vii.testimonials.cta-heading-accent",
    "vii.testimonials.cta-body",
    "vii.testimonials.cta-button",
  ]);

  return (
    <PageTransition>
      <ViiTestimonialsClient
        overline={f["vii.testimonials.overline"] ?? ""}
        heading={f["vii.testimonials.heading"] ?? ""}
        headingAccent={f["vii.testimonials.heading-accent"] ?? ""}
        intro={f["vii.testimonials.intro"] ?? ""}
        emptyMessage={f["vii.testimonials.empty-message"] ?? ""}
        ctaHeading={f["vii.testimonials.cta-heading"] ?? ""}
        ctaHeadingAccent={f["vii.testimonials.cta-heading-accent"] ?? ""}
        ctaBody={f["vii.testimonials.cta-body"] ?? ""}
        ctaButton={f["vii.testimonials.cta-button"] ?? ""}
        testimonials={testimonials}
      />
    </PageTransition>
  );
}
