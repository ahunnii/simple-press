import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { renderBoldMarkup } from "../homepage/wealth-bold-markup";
import { WealthBlock } from "../shared/wealth-block";
import { WealthEyebrow } from "../shared/wealth-eyebrow";
import { WealthReveal } from "../shared/wealth-reveal";
import { WealthSplitHero } from "../shared/wealth-split-hero";

type Props = {
  eyebrow: string;
  heading: string;
  /** Optional photo; blank = full-width typographic panel. */
  image: string;
  imageAlt: string;
  paragraph1: string;
  paragraph2: string;
  paragraph3: string;
};

/**
 * About — split hero (the page's only H1) followed by the prose-width story
 * column. Both blocks belong to the `about.hero` group. Not hideable.
 */
export function WealthAboutHero({
  eyebrow,
  heading,
  image,
  imageAlt,
  paragraph1,
  paragraph2,
  paragraph3,
}: Props) {
  const body = [
    { text: paragraph2, key: "wealth.about.hero-paragraph-2" },
    { text: paragraph3, key: "wealth.about.hero-paragraph-3" },
  ].filter((p) => p.text.trim() !== "");

  return (
    <>
      <WealthSplitHero
        ratio="sixty"
        image={image || null}
        imageAlt={imageAlt}
        className="wealth-about-hero"
        aria-labelledby="wealth-about-title"
        {...sectionGroupAttr("about", "hero")}
      >
        {eyebrow.trim() ? (
          <WealthReveal>
            <WealthEyebrow as="p" {...fieldAttr("wealth.about.hero-eyebrow")}>
              {eyebrow}
            </WealthEyebrow>
          </WealthReveal>
        ) : null}
        <WealthReveal delay={1}>
          <h1
            id="wealth-about-title"
            className="wealth-hero__title"
            {...fieldAttr("wealth.about.hero-heading")}
          >
            {heading}
          </h1>
        </WealthReveal>
        <WealthReveal delay={2}>
          <hr className="wealth-hero__rule" />
        </WealthReveal>
      </WealthSplitHero>

      {paragraph1.trim() !== "" || body.length > 0 ? (
        <WealthBlock
          tone="paper"
          container="prose"
          spacing="flush-bottom"
          className="wealth-about-story"
          aria-label="Our story"
          {...sectionGroupAttr("about", "hero")}
        >
          <div className="wealth-stack">
            {paragraph1.trim() ? (
              <WealthReveal threshold={0}>
                {/* No fieldAttr: `**` markup is transformed to <strong>. */}
                <p className="wealth-lead">{renderBoldMarkup(paragraph1)}</p>
              </WealthReveal>
            ) : null}
            {body.map((p) => (
              <WealthReveal key={p.key} threshold={0}>
                <p {...fieldAttr(p.key)}>{p.text}</p>
              </WealthReveal>
            ))}
          </div>
        </WealthBlock>
      ) : null}
    </>
  );
}
