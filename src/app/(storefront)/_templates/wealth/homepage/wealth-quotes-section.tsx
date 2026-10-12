import type { WealthQuote } from "../shared/wealth-quote-carousel";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { WealthBlock } from "../shared/wealth-block";
import { WealthEyebrow } from "../shared/wealth-eyebrow";
import { WealthQuoteCarousel } from "../shared/wealth-quote-carousel";
import { WealthReveal } from "../shared/wealth-reveal";

type Props = {
  eyebrow: string;
  heading: string;
  /** Approved public testimonials only — never sample quotes. */
  quotes: WealthQuote[];
};

/**
 * From our co-ops — quote carousel on the grey surface block. Renders nothing
 * when there are no approved testimonials (the orchestrator also skips the
 * fetch when the testimonials flag is off).
 */
export function WealthQuotesSection({ eyebrow, heading, quotes }: Props) {
  if (quotes.length === 0) return null;
  const hasHeading = heading.trim() !== "";
  return (
    <WealthBlock
      tone="surface"
      aria-labelledby={hasHeading ? "wealth-quotes-h" : undefined}
      aria-label={hasHeading ? undefined : "Quotes from co-op members"}
      {...sectionGroupAttr("homepage", "quotes")}
    >
      {eyebrow.trim() || hasHeading ? (
        <WealthReveal className="wealth-section-head wealth-section-head--split">
          <div>
            {eyebrow.trim() ? (
              <WealthEyebrow
                as="p"
                className="wealth-eyebrow--block"
                {...fieldAttr("wealth.homepage.quotes-eyebrow")}
              >
                {eyebrow}
              </WealthEyebrow>
            ) : null}
            {hasHeading ? (
              <h2
                className="wealth-h2"
                id="wealth-quotes-h"
                {...fieldAttr("wealth.homepage.quotes-heading")}
              >
                {heading}
              </h2>
            ) : null}
          </div>
        </WealthReveal>
      ) : null}
      <WealthReveal>
        <WealthQuoteCarousel
          quotes={quotes}
          label="Quotes from co-op members"
        />
      </WealthReveal>
    </WealthBlock>
  );
}
