import type { ComponentProps } from "react";

import { fieldAttr } from "~/lib/preview/section-attrs";

import { UmscGoogleReviewLink } from "./umsc-google-review-link";
import { UmscHeading } from "./umsc-heading";
import { UmscLede } from "./umsc-lede";
import { UmscRevealGroup } from "./umsc-reveal";
import { UmscReviewCard } from "./umsc-review-card";
import { UmscSection } from "./umsc-section";

export type UmscReviewCardData = {
  quote: string;
  name: string;
  source?: string;
};

/** The slice of a testimonial record the review cards read. */
type UmscReviewTestimonial = {
  text: string;
  customerName: string;
  source: string;
};

/**
 * Maps the latest approved testimonials to review cards: customer-submitted
 * ones get `verifiedSource`; the owner's own quotes get no source line at all
 * (the reviewer name shows alone). Server-safe (no client code) so any page's
 * data layer can call it.
 */
export function toUmscReviewCards(
  testimonials: UmscReviewTestimonial[],
  sources: { verifiedSource: string },
  limit: number,
): UmscReviewCardData[] {
  return testimonials.slice(0, limit).map((t) => ({
    quote: t.text,
    name: t.customerName,
    source: t.source === "owner" ? undefined : sources.verifiedSource,
  }));
}

type Props = {
  heading: string;
  lede: string;
  cards: UmscReviewCardData[];
  emptyText: string;
  googleReviewUrl: string;
  sectionAttrs?: Record<string, string>;
  /** Field keys for the editable heading / lede / empty-state text. */
  headingFieldKey: string;
  ledeFieldKey: string;
  emptyTextFieldKey: string;
  /** Heading `id`; also the section's `aria-labelledby` target. */
  headingId: string;
  tone?: ComponentProps<typeof UmscSection>["tone"];
};

/**
 * UmscReviewsSection — "Our customers. Our community." (homepage.reviews,
 * reused by other pages; each caller passes its own field keys and heading
 * id). h2 + lede; three latest approved testimonials (a manual override quote/
 * name pair wins the first slot when set) as `UmscReviewCard`s, with the
 * Google review link beside the heading. Empty: the Google-review link
 * alone on one cream card (design.md "Homepage → Our customers. Our
 * community.").
 */
export function UmscReviewsSection({
  heading,
  lede,
  cards,
  emptyText,
  googleReviewUrl,
  sectionAttrs,
  headingFieldKey,
  ledeFieldKey,
  emptyTextFieldKey,
  headingId,
  tone = "paper",
}: Props) {
  return (
    <UmscSection
      tone={tone}
      aria-labelledby={headingId}
      sectionAttrs={sectionAttrs}
    >
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6 sm:mb-14">
        <div>
          <UmscHeading as="h2" id={headingId} fieldKey={headingFieldKey}>
            {heading}
          </UmscHeading>
          {lede && (
            <UmscLede fieldKey={ledeFieldKey} className="mt-3">
              {lede}
            </UmscLede>
          )}
        </div>
        {cards.length > 0 && <UmscGoogleReviewLink href={googleReviewUrl} />}
      </div>

      {cards.length > 0 ? (
        <UmscRevealGroup className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {cards.map((card, i) => (
            <div
              key={i}
              className="umsc-reveal-item"
              style={{ "--i": Math.min(i, 6) } as React.CSSProperties}
            >
              <UmscReviewCard
                quote={card.quote}
                name={card.name}
                source={card.source}
              />
            </div>
          ))}
        </UmscRevealGroup>
      ) : (
        <div className="mx-auto flex max-w-[420px] flex-col items-center gap-4 border border-[var(--umsc-line)] bg-[var(--umsc-cream)] p-8 text-center">
          <UmscGoogleReviewLink
            href={googleReviewUrl}
            className="justify-center"
          />
          <p
            {...fieldAttr(emptyTextFieldKey)}
            className="umsc-sans text-[14px] text-[var(--umsc-muted)]"
          >
            {emptyText}
          </p>
        </div>
      )}
    </UmscSection>
  );
}
