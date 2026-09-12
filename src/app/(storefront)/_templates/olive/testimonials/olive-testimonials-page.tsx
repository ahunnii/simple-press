import type { DefaultTestimonialsPageTemplateProps } from "../../types";
import type { RouterOutputs } from "~/trpc/react";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { api } from "~/trpc/server";

import { resolveFields } from "..";
import {
  OliveButton,
  OliveEmptyState,
  OliveLeafMark,
  OliveReveal,
  OliveRevealGroup,
  OliveSection,
} from "../shared";

type Testimonial = RouterOutputs["testimonial"]["list"][number];

function formatTestimonialDate(value: Date | string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function attributionLine(testimonial: Testimonial): string {
  return [testimonial.customerTitle, testimonial.customerCompany]
    .filter((part): part is string => Boolean(part))
    .join(", ");
}

function TestimonialCard({
  testimonial,
  index,
}: {
  testimonial: Testimonial;
  index: number;
}) {
  const attribution = attributionLine(testimonial);

  return (
    <div
      className="olive-card olive-card-paper olive-reveal-item mb-3 flex break-inside-avoid flex-col gap-3 p-6"
      style={{ "--i": Math.min(index, 8) } as React.CSSProperties}
    >
      <span aria-hidden="true" style={{ color: "var(--olive-sage-bright)" }}>
        <OliveLeafMark size={18} />
      </span>
      {testimonial.title ? (
        <p className="olive-card-title">{testimonial.title}</p>
      ) : null}
      <p
        className="text-[0.9375rem] leading-relaxed"
        style={{ color: "var(--olive-ink)" }}
      >
        {testimonial.text}
      </p>
      <div>
        <p className="olive-label" style={{ color: "var(--olive-ink)" }}>
          {testimonial.customerName}
        </p>
        {attribution ? <p className="olive-caption">{attribution}</p> : null}
        <time
          dateTime={new Date(testimonial.testimonialDate).toISOString()}
          className="olive-caption mt-1 block"
        >
          {formatTestimonialDate(testimonial.testimonialDate)}
        </time>
      </div>
    </div>
  );
}

/**
 * testimonials.hero bundles the page heading with the featured quote and the
 * masonry grid — the latter two have no owner-editable fields (they render
 * whatever the business's approved testimonials are), so they share the
 * hero's field group per design.md rather than inventing an empty one.
 */
export async function OliveTestimonialsPage({
  business,
}: DefaultTestimonialsPageTemplateProps) {
  const testimonials = await api.testimonial.list({ publicOnly: true });

  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields, [
    "olive.testimonials.hero-heading",
    "olive.testimonials.hero-body",
    "olive.testimonials.empty-message",
    "olive.testimonials.cta-heading",
    "olive.testimonials.cta-body",
    "olive.testimonials.cta-button-label",
  ]);

  const featured = testimonials[0];
  const rest = testimonials.slice(1);

  return (
    <>
      <OliveSection
        as="section"
        aria-label="Kind words"
        tone="white"
        {...sectionGroupAttr("testimonials", "hero")}
        className="flex flex-col items-center gap-3 text-center"
      >
        <h1
          className="olive-h1"
          {...fieldAttr("olive.testimonials.hero-heading")}
        >
          {f["olive.testimonials.hero-heading"] ?? "Kind words"}
        </h1>
        {f["olive.testimonials.hero-body"] ? (
          <p
            className="max-w-[52ch] text-[0.9375rem] leading-relaxed"
            style={{ color: "var(--olive-ink-soft)" }}
            {...fieldAttr("olive.testimonials.hero-body")}
          >
            {f["olive.testimonials.hero-body"]}
          </p>
        ) : null}
      </OliveSection>

      {featured ? (
        <OliveSection as="section" aria-label="Featured review" tone="slate">
          <OliveReveal className="mx-auto flex max-w-[720px] flex-col items-center gap-6 text-center">
            <span aria-hidden="true" style={{ color: "var(--olive-leaf)" }}>
              <OliveLeafMark size={28} />
            </span>
            <blockquote className="m-0 flex flex-col gap-6">
              {featured.title ? (
                <p className="olive-card-title">{featured.title}</p>
              ) : null}
              <p className="olive-display" style={{ fontStyle: "italic" }}>
                {featured.text}
              </p>
              <footer>
                <cite
                  className="olive-label not-italic"
                  style={{ color: "var(--olive-ink)" }}
                >
                  {featured.customerName}
                  {attributionLine(featured)
                    ? `, ${attributionLine(featured)}`
                    : ""}
                </cite>
              </footer>
            </blockquote>
          </OliveReveal>
        </OliveSection>
      ) : (
        <OliveSection
          as="section"
          aria-label="No reviews yet"
          tone="paper"
          className="flex justify-center"
        >
          <OliveEmptyState
            heading={
              f["olive.testimonials.empty-message"] ??
              "Be the first to leave one."
            }
            className="w-full max-w-[480px]"
          />
        </OliveSection>
      )}

      {rest.length > 0 ? (
        <OliveSection as="section" aria-label="More reviews" tone="paper">
          <OliveRevealGroup className="columns-1 gap-4 sm:columns-2 lg:columns-3">
            {rest.map((testimonial, i) => (
              <TestimonialCard
                key={testimonial.id}
                testimonial={testimonial}
                index={i}
              />
            ))}
          </OliveRevealGroup>
        </OliveSection>
      ) : null}

      {isSectionVisible(customFields, "olive", "testimonials.cta") && (
        <OliveSection
          as="section"
          aria-label="Share your experience"
          tone="white"
          {...sectionGroupAttr("testimonials", "cta")}
          className="flex flex-col items-center gap-4 text-center"
        >
          <h2
            className="olive-h2"
            {...fieldAttr("olive.testimonials.cta-heading")}
          >
            {f["olive.testimonials.cta-heading"] ?? ""}
          </h2>
          {f["olive.testimonials.cta-body"] ? (
            <p
              className="max-w-[52ch] text-[0.9375rem] leading-relaxed"
              style={{ color: "var(--olive-ink-soft)" }}
              {...fieldAttr("olive.testimonials.cta-body")}
            >
              {f["olive.testimonials.cta-body"]}
            </p>
          ) : null}
          <OliveButton
            variant="primary"
            href="/testimonials/submit"
            data-sp-field="olive.testimonials.cta-button-label"
          >
            {f["olive.testimonials.cta-button-label"] ??
              "Share your experience"}
          </OliveButton>
        </OliveSection>
      )}
    </>
  );
}
