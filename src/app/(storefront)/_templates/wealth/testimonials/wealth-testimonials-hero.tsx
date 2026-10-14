import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { WealthEyebrow } from "../shared/wealth-eyebrow";
import { WealthLedgeButton } from "../shared/wealth-ledge-button";
import { WealthReveal } from "../shared/wealth-reveal";
import { WealthSplitHero } from "../shared/wealth-split-hero";

type Props = {
  eyebrow: string;
  heading: string;
  intro: string;
  linkLabel: string;
  linkUrl: string;
  image: string;
  imageAlt: string;
};

/**
 * Meet the Co-ops — split hero, forest panel on the left and the tinted
 * co-op photo on the right (two-thirds, reversed). Blank photo → full-width
 * panel. The directory link is an on-dark ledge button. Not hideable.
 */
export function WealthTestimonialsHero({
  eyebrow,
  heading,
  intro,
  linkLabel,
  linkUrl,
  image,
  imageAlt,
}: Props) {
  const external = /^https?:\/\//i.test(linkUrl);
  return (
    <WealthSplitHero
      ratio="two-thirds"
      reverse
      image={image || null}
      imageAlt={imageAlt}
      className="wealth-testimonials-hero"
      aria-labelledby="wealth-testimonials-title"
      {...sectionGroupAttr("testimonials", "hero")}
    >
      {eyebrow.trim() ? (
        <WealthReveal>
          <WealthEyebrow
            as="p"
            {...fieldAttr("wealth.testimonials.hero-eyebrow")}
          >
            {eyebrow}
          </WealthEyebrow>
        </WealthReveal>
      ) : null}
      <WealthReveal delay={1}>
        <h1
          id="wealth-testimonials-title"
          className="wealth-display wealth-testimonials-hero__title"
          {...fieldAttr("wealth.testimonials.hero-heading")}
        >
          {heading}
        </h1>
      </WealthReveal>
      {intro.trim() ? (
        <WealthReveal delay={2}>
          <p
            className="wealth-hero__excerpt"
            {...fieldAttr("wealth.testimonials.hero-intro")}
          >
            {intro}
          </p>
        </WealthReveal>
      ) : null}
      {linkLabel.trim() && linkUrl ? (
        <WealthReveal delay={3} className="wealth-btn-row">
          <WealthLedgeButton
            href={linkUrl}
            onDark
            className="wealth-testimonials-hero__btn"
          >
            <span {...fieldAttr("wealth.testimonials.hero-link-label")}>
              {linkLabel}
            </span>
            {external ? <span aria-hidden="true">&#8599;</span> : null}
          </WealthLedgeButton>
        </WealthReveal>
      ) : null}
    </WealthSplitHero>
  );
}
