import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { WealthBlock } from "../shared/wealth-block";
import { WealthReveal } from "../shared/wealth-reveal";
import { WealthSplitHero } from "../shared/wealth-split-hero";

type HeroProps = {
  heading: string;
  /** Italic excerpt under the heading. */
  intro1: string;
  /** Plain body line under the excerpt. */
  intro2: string;
  /** Optional photo; blank = full-width panel. */
  image: string;
  imageAlt: string;
};

/**
 * Contact — forest hero (the page's only H1): heading, italic intro, body
 * intro. A full-width panel unless the owner adds a photo. Not hideable.
 */
export function WealthContactHero({
  heading,
  intro1,
  intro2,
  image,
  imageAlt,
}: HeroProps) {
  return (
    <WealthSplitHero
      ratio="sixty"
      image={image || null}
      imageAlt={imageAlt}
      className="wealth-contact-hero"
      aria-labelledby="wealth-contact-title"
      {...sectionGroupAttr("contact", "hero")}
    >
      <WealthReveal>
        <h1
          id="wealth-contact-title"
          className="wealth-hero__title"
          {...fieldAttr("wealth.contact.hero-heading")}
        >
          {heading}
        </h1>
      </WealthReveal>
      {intro1.trim() ? (
        <WealthReveal delay={1}>
          <p
            className="wealth-hero__excerpt"
            {...fieldAttr("wealth.contact.hero-intro-1")}
          >
            {intro1}
          </p>
        </WealthReveal>
      ) : null}
      {intro2.trim() ? (
        <WealthReveal delay={2}>
          <p
            className="wealth-contact-hero__body"
            {...fieldAttr("wealth.contact.hero-intro-2")}
          >
            {intro2}
          </p>
        </WealthReveal>
      ) : null}
    </WealthSplitHero>
  );
}

/** Centered italic closing line under the form (`contact.hero` group). */
export function WealthContactClosing({ line }: { line: string }) {
  if (!line.trim()) return null;
  return (
    <WealthBlock
      tone="paper"
      container="narrow"
      spacing="tight"
      aria-label="Closing note"
      {...sectionGroupAttr("contact", "hero")}
    >
      <WealthReveal>
        <p
          className="wealth-contact-closing"
          {...fieldAttr("wealth.contact.closing-line")}
        >
          {line}
        </p>
      </WealthReveal>
    </WealthBlock>
  );
}
