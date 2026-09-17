import type { RouterOutputs } from "~/trpc/react";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { DreamButton } from "../shared/dream-button";
import { DreamSection } from "../shared/dream-section";

type Testimonial = RouterOutputs["testimonial"]["list"][number];

type Props = {
  testimonials: Testimonial[];
  emptyMessage: string;
  emptyCtaLabel: string;
};

/**
 * Typographic opening quote mark in the display face (design.md craft
 * floor: "no emoji as icons" plus this finish-review pass replacing the
 * lucide `Quote` glyph so the mark reads as part of the Italiana type
 * system, not a generic icon). Gold-ink on the featured quote, rose on
 * cards.
 */
function DreamQuoteMark({
  tone,
  size,
}: {
  tone: "gold" | "rose";
  size: "lg" | "sm";
}) {
  // Italiana's “ glyph sits low and small relative to its em box (it reads
  // as two short ticks rather than a raised opening quote at normal text
  // sizes) — a large size plus a tightened `line-height` pulls it in as a
  // proper decorative mark instead of a stray blemish above the quote.
  return (
    <span
      aria-hidden="true"
      className={`block font-[family-name:var(--font-dream-display)] ${
        size === "lg"
          ? "text-[120px] leading-[0.5]"
          : "text-[64px] leading-[0.55]"
      } ${tone === "gold" ? "text-[var(--dream-gold-ink)]" : "text-[var(--dream-rose)]"}`}
    >
      &ldquo;
    </span>
  );
}

/**
 * The first approved review as a full-width Italiana pull-quote room on a
 * sky-toned `DreamSection`, then a CSS-columns masonry of the rest as paper
 * cards with a gold hairline and a rose opening quote mark (design.md
 * "Per-page section concepts › Testimonials"). One `<section>` root (both
 * the pull-quote and the masonry belong to the same `testimonials.featured`
 * group) so the preview overlay's hotspot stays unambiguous. Never
 * hardcodes example reviews — approved testimonials are fetched server-side
 * by the page and handed down as `testimonials`.
 */
export function DreamTestimonialsFeatured({
  testimonials,
  emptyMessage,
  emptyCtaLabel,
}: Props) {
  const sectionAttrs = sectionGroupAttr("testimonials", "featured");

  if (testimonials.length === 0) {
    return (
      <DreamSection
        sectionAttrs={sectionAttrs}
        tone="sky"
        aria-label="Testimonials"
      >
        <div className="mx-auto flex max-w-[560px] flex-col items-center gap-6 text-center">
          <DreamQuoteMark tone="gold" size="lg" />
          <p
            className="text-lg text-[var(--dream-soft)]"
            {...fieldAttr("dream.testimonials.hero-empty-message")}
          >
            {emptyMessage}
          </p>
          <DreamButton href="/testimonials/submit" variant="primary">
            <span {...fieldAttr("dream.testimonials.featured-empty-cta-label")}>
              {emptyCtaLabel}
            </span>
          </DreamButton>
        </div>
      </DreamSection>
    );
  }

  const [featured, ...rest] = testimonials;
  if (!featured) return null;

  return (
    <DreamSection
      sectionAttrs={sectionAttrs}
      tone="sky"
      aria-label="What clients are saying"
    >
      <figure className="mx-auto max-w-[760px] text-center">
        <DreamQuoteMark tone="gold" size="lg" />
        <blockquote className="mt-6">
          <p className="font-[family-name:var(--font-dream-display)] text-[clamp(24px,3.2vw,36px)] leading-[1.25] text-[var(--dream-ink)]">
            &ldquo;{featured.text}&rdquo;
          </p>
        </blockquote>
        <figcaption className="mt-6 text-sm text-[var(--dream-soft)]">
          {featured.customerName}
          {featured.customerCompany ? `, ${featured.customerCompany}` : ""}
        </figcaption>
      </figure>

      {rest.length > 0 ? (
        <div
          className="dream-testimonials-masonry mt-16"
          data-count={rest.length}
        >
          {rest.map((t) => (
            <div
              key={t.id}
              className="rounded-[var(--dream-radius-card)] border border-[var(--dream-line)] bg-[var(--dream-paper)] p-6 shadow-[var(--dream-shadow-card)]"
            >
              <DreamQuoteMark tone="rose" size="sm" />
              <p className="mt-3 text-[var(--dream-ink)]">
                &ldquo;{t.text}&rdquo;
              </p>
              <p className="mt-3 text-sm text-[var(--dream-soft)]">
                {t.customerName}
                {t.customerCompany ? `, ${t.customerCompany}` : ""}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </DreamSection>
  );
}
