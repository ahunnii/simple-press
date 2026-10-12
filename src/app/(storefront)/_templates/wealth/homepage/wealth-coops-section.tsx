import type { WealthCoopLogoRow } from "./wealth-homepage-rows";
import {
  fieldAttr,
  listItemAttr,
  sectionGroupAttr,
} from "~/lib/preview/section-attrs";

import { WealthBlock } from "../shared/wealth-block";
import { WealthEyebrow } from "../shared/wealth-eyebrow";
import { WealthLedgeButton } from "../shared/wealth-ledge-button";
import { WealthLogoStrip } from "../shared/wealth-logo-strip";
import { WealthOverlapCard } from "../shared/wealth-overlap-card";
import { WealthReveal } from "../shared/wealth-reveal";

type Props = {
  image: string;
  imageAlt: string;
  eyebrow: string;
  heading: string;
  body: string;
  /** Either blank hides the button. */
  buttonLabel: string;
  buttonHref: string;
  logos: WealthCoopLogoRow[];
};

/**
 * Meet the Co-ops — the mirrored overlap card (photo right, grey card left on
 * desktop) with the co-op logo strip beneath. The logos are the Testimonials
 * page's `wealth.testimonials.coops` list (or the same built-in examples).
 */
export function WealthCoopsSection({
  image,
  imageAlt,
  eyebrow,
  heading,
  body,
  buttonLabel,
  buttonHref,
  logos,
}: Props) {
  const hasHeading = heading.trim() !== "";
  const showButton = buttonLabel.trim() !== "" && buttonHref !== "";
  return (
    <WealthBlock
      tone="paper"
      aria-labelledby={hasHeading ? "wealth-coops-h" : undefined}
      {...sectionGroupAttr("homepage", "coops")}
    >
      <WealthOverlapCard
        image={image}
        imageAlt={imageAlt}
        mirrored
        tone="surface"
      >
        {eyebrow.trim() ? (
          <WealthEyebrow as="p" {...fieldAttr("wealth.homepage.coops-eyebrow")}>
            {eyebrow}
          </WealthEyebrow>
        ) : null}
        {hasHeading ? (
          <h2
            className="wealth-display"
            id="wealth-coops-h"
            {...fieldAttr("wealth.homepage.coops-heading")}
          >
            {heading}
          </h2>
        ) : null}
        {body.trim() ? (
          <p
            className="wealth-sub whitespace-pre-line"
            {...fieldAttr("wealth.homepage.coops-body")}
          >
            {body}
          </p>
        ) : null}
        {showButton ? (
          <div className="wealth-btn-row">
            <WealthLedgeButton href={buttonHref}>
              <span {...fieldAttr("wealth.homepage.coops-button-label")}>
                {buttonLabel}
              </span>
            </WealthLedgeButton>
          </div>
        ) : null}
      </WealthOverlapCard>

      <WealthReveal className="mt-16">
        <WealthLogoStrip
          label="Co-ops we have supported"
          logos={logos.map((logo, i) => ({
            key: `${logo.src}-${i}`,
            src: logo.src,
            alt: logo.name,
            href: logo.url || null,
            attrs:
              logo.sourceIndex >= 0
                ? listItemAttr("wealth.testimonials.coops", logo.sourceIndex)
                : undefined,
          }))}
        />
      </WealthReveal>
    </WealthBlock>
  );
}
