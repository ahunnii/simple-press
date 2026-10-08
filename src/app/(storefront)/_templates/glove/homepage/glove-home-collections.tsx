import Image from "next/image";

import { fieldAttr, listItemAttr } from "~/lib/preview/section-attrs";

import {
  GloveButton,
  GloveHeading,
  GloveRevealGroup,
  gloveRevealItemStyle,
  GloveSection,
} from "../shared";
import { gloveIsExternal } from "../steps/glove-links";

export type GloveCollectionCard = {
  id: string;
  /** Index in the saved list (editor row targeting). */
  index: number;
  heading: string;
  body: string;
  image: string;
  imageAlt: string;
  linkLabel: string;
  /** Empty hides the link (blank, or its route's feature is off). */
  linkUrl: string;
};

type GloveHomeCollectionsProps = {
  heading: string;
  intro: string;
  cards: GloveCollectionCard[];
  sectionAttrs?: Record<string, string>;
};

/**
 * Two large photo cards, each with a frosted paper panel (20px radius) holding
 * a Poppins heading, a paragraph and an optional link.
 */
export function GloveHomeCollections({
  heading,
  intro,
  cards,
  sectionAttrs,
}: GloveHomeCollectionsProps) {
  return (
    <GloveSection
      aria-labelledby="glove-collections-heading"
      sectionAttrs={sectionAttrs}
    >
      <div className="mx-auto max-w-[820px] text-center">
        <GloveHeading
          id="glove-collections-heading"
          fieldKey="glove.homepage.collections-heading"
        >
          {heading}
        </GloveHeading>
        {intro ? (
          <p
            className="glove-body mt-4 text-[16px] leading-[1.7] text-[var(--glove-text)] md:text-[17px]"
            {...fieldAttr("glove.homepage.collections-intro")}
          >
            {intro}
          </p>
        ) : null}
      </div>

      {cards.length > 0 ? (
        <GloveRevealGroup threshold={0}>
          <ul className="m-0 mt-10 grid list-none grid-cols-1 gap-6 p-0 md:mt-12 md:grid-cols-2 md:gap-8">
            {cards.map((card, i) => (
              <li
                key={card.id}
                className="glove-reveal-item relative flex min-h-[520px] items-end overflow-hidden rounded-[30px] bg-[var(--glove-cloud)] p-4 md:min-h-[640px] md:p-8"
                style={gloveRevealItemStyle(i)}
                {...listItemAttr("glove.homepage.collections-list", card.index)}
              >
                {card.image ? (
                  <Image
                    src={card.image}
                    alt={card.imageAlt}
                    fill
                    sizes="(max-width: 768px) 92vw, 600px"
                    className="object-cover"
                  />
                ) : null}
                <div className="relative z-10 w-full rounded-[20px] bg-[color-mix(in_srgb,var(--glove-paper)_82%,transparent)] px-5 pt-7 pb-6 text-center shadow-[var(--glove-shadow-sm)] backdrop-blur-sm md:px-8 md:pt-8 md:pb-8">
                  <h3 className="glove-display text-[clamp(24px,2.8vw,38px)] leading-[1.2] font-medium text-[var(--glove-ink)]">
                    {card.heading}
                  </h3>
                  {card.body ? (
                    <p className="glove-body mt-4 text-[15px] leading-[1.7] text-[var(--glove-ink)]">
                      {card.body}
                    </p>
                  ) : null}
                  {card.linkLabel && card.linkUrl ? (
                    <GloveButton
                      href={card.linkUrl}
                      external={gloveIsExternal(card.linkUrl)}
                      size="sm"
                      className="mt-5"
                    >
                      {card.linkLabel}
                    </GloveButton>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </GloveRevealGroup>
      ) : null}
    </GloveSection>
  );
}
