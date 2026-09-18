import { fieldAttr } from "~/lib/preview/section-attrs";

import { UmscGoogleReviewLink } from "../shared/umsc-google-review-link";
import { UmscHeading } from "../shared/umsc-heading";
import { UmscLede } from "../shared/umsc-lede";
import { UmscRevealGroup } from "../shared/umsc-reveal";
import { UmscReviewCard } from "../shared/umsc-review-card";
import { UmscSection } from "../shared/umsc-section";

export type UmscReviewCardData = {
  quote: string;
  name: string;
  source?: string;
};

type Props = {
  heading: string;
  lede: string;
  cards: UmscReviewCardData[];
  emptyText: string;
  googleReviewUrl: string;
  sectionAttrs?: Record<string, string>;
};

/**
 * UmscReviewsSection (homepage.reviews) — "Our customers. Our community."
 * h2 + lede; three latest approved testimonials (a manual override quote/
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
}: Props) {
  return (
    <UmscSection
      tone="paper"
      aria-labelledby="umsc-reviews-heading"
      sectionAttrs={sectionAttrs}
    >
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6 sm:mb-14">
        <div>
          <UmscHeading
            as="h2"
            id="umsc-reviews-heading"
            fieldKey="umsc.homepage.reviews-heading"
          >
            {heading}
          </UmscHeading>
          {lede && (
            <UmscLede fieldKey="umsc.homepage.reviews-lede" className="mt-3">
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
            {...fieldAttr("umsc.homepage.reviews-empty-text")}
            className="umsc-sans text-[14px] text-[var(--umsc-muted)]"
          >
            {emptyText}
          </p>
        </div>
      )}
    </UmscSection>
  );
}
