import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { WealthArrowLink } from "../shared/wealth-arrow-link";
import { WealthBlock } from "../shared/wealth-block";
import { WealthEyebrow } from "../shared/wealth-eyebrow";
import { WealthPostCard } from "../shared/wealth-post-card";
import { WealthReveal, WealthRevealGroup } from "../shared/wealth-reveal";

export type WealthNewsCard = {
  key: string;
  href: string;
  title: string;
  meta?: string;
  excerpt?: string;
  image?: string;
  /** Spread on the card (e.g. `listItemAttr` for owner-entered press rows). */
  attrs?: Record<string, string>;
};

type Props = {
  eyebrow: string;
  heading: string;
  /** "" hides the all-news link (blank, or the blog is switched off). */
  linkLabel: string;
  linkHref: string;
  buttonLabel: string;
  cards: WealthNewsCard[];
};

/**
 * News & Notes — grey band with up to three square-image cards: the newest
 * blog posts, or (the orchestrator's choice) press mentions as image-less
 * cards when there are no posts.
 */
export function WealthNewsSection({
  eyebrow,
  heading,
  linkLabel,
  linkHref,
  buttonLabel,
  cards,
}: Props) {
  if (cards.length === 0) return null;
  const hasHeading = heading.trim() !== "";
  const showLink = linkLabel.trim() !== "" && linkHref !== "";
  return (
    <WealthBlock
      tone="surface"
      aria-labelledby={hasHeading ? "wealth-news-h" : undefined}
      aria-label={hasHeading ? undefined : "News"}
      {...sectionGroupAttr("homepage", "news")}
    >
      {eyebrow.trim() || hasHeading || showLink ? (
        <WealthReveal className="wealth-section-head wealth-section-head--split">
          <div>
            {eyebrow.trim() ? (
              <WealthEyebrow
                as="p"
                className="wealth-eyebrow--block"
                {...fieldAttr("wealth.homepage.news-eyebrow")}
              >
                {eyebrow}
              </WealthEyebrow>
            ) : null}
            {hasHeading ? (
              <h2
                className="wealth-h2"
                id="wealth-news-h"
                {...fieldAttr("wealth.homepage.news-heading")}
              >
                {heading}
              </h2>
            ) : null}
          </div>
          {showLink ? (
            <WealthArrowLink href={linkHref}>
              <span {...fieldAttr("wealth.homepage.news-link-label")}>
                {linkLabel}
              </span>
            </WealthArrowLink>
          ) : null}
        </WealthReveal>
      ) : null}

      <WealthRevealGroup className="wealth-posts">
        {cards.map((card, i) => (
          <WealthPostCard
            key={card.key}
            {...card.attrs}
            className="wealth-reveal-item"
            style={{ "--i": Math.min(i, 7) } as React.CSSProperties}
            href={card.href}
            title={card.title}
            image={card.image}
            meta={card.meta}
            excerpt={card.excerpt}
            ctaLabel={buttonLabel}
          />
        ))}
      </WealthRevealGroup>
    </WealthBlock>
  );
}
