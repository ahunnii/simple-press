import type { RouterOutputs } from "~/trpc/react";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { UmscReveal, UmscRevealGroup } from "../shared/umsc-reveal";
import { UmscReviewCard } from "../shared/umsc-review-card";
import { UmscSection } from "../shared/umsc-section";

type Testimonial = RouterOutputs["testimonial"]["list"][number];

type Props = {
  testimonials: Testimonial[];
  sourceLabel: string;
  emptyMessage: string;
};

function attribution(testimonial: Testimonial, sourceLabel: string): string {
  const context = [testimonial.customerTitle, testimonial.customerCompany]
    .filter(Boolean)
    .join(", ");
  return context || sourceLabel;
}

/**
 * UmscTestimonialsFeatured — design.md "Testimonials": the first (most
 * recent approved) review as a Marcellus pull-quote on cream, the rest as
 * `UmscReviewCard`s in a CSS-columns masonry. Not hideable — "Empty: hero +
 * band only" (design.md), so this renders a short designed empty state in
 * place of the quote/masonry when there are no testimonials yet.
 */
export function UmscTestimonialsFeatured({
  testimonials,
  sourceLabel,
  emptyMessage,
}: Props) {
  const [featured, ...rest] = testimonials;

  return (
    <UmscSection
      tone="paper"
      aria-label="Customer reviews"
      sectionAttrs={sectionGroupAttr("testimonials", "featured")}
    >
      {featured ? (
        <>
          <UmscReveal className="mx-auto mb-16 flex max-w-[760px] flex-col items-center gap-6 border border-[var(--umsc-line)] bg-[var(--umsc-cream)] px-8 py-14 text-center sm:px-16">
            <span
              aria-hidden="true"
              className="h-px w-16 bg-[var(--umsc-gold)]"
            />
            <blockquote className="umsc-serif m-0 text-[clamp(24px,3vw,34px)] leading-[1.35] text-[var(--umsc-ink)]">
              &ldquo;{featured.text}&rdquo;
            </blockquote>
            <figcaption className="umsc-sans text-[13px] text-[var(--umsc-muted)]">
              <span className="font-semibold text-[var(--umsc-ink)]">
                {featured.customerName}
              </span>
              {" · "}
              <span {...fieldAttr("umsc.testimonials.review-source-label")}>
                {attribution(featured, sourceLabel)}
              </span>
            </figcaption>
          </UmscReveal>

          {rest.length > 0 && (
            <UmscRevealGroup
              className="columns-1 gap-6 sm:columns-2 lg:columns-3"
              style={{ columnGap: 24 }}
            >
              {rest.map((testimonial, i) => (
                <div
                  key={testimonial.id}
                  className="umsc-reveal-item mb-6 break-inside-avoid"
                  style={{ "--i": Math.min(i, 6) } as React.CSSProperties}
                >
                  <UmscReviewCard
                    quote={testimonial.text}
                    name={testimonial.customerName}
                    source={attribution(testimonial, sourceLabel)}
                  />
                </div>
              ))}
            </UmscRevealGroup>
          )}
        </>
      ) : (
        <UmscReveal className="mx-auto flex max-w-[520px] flex-col items-center gap-3 py-8 text-center">
          <p
            {...fieldAttr("umsc.testimonials.empty-message")}
            className="umsc-sans m-0 text-[16px] text-[var(--umsc-muted)]"
          >
            {emptyMessage}
          </p>
        </UmscReveal>
      )}
    </UmscSection>
  );
}
