import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { WealthLedgeButton } from "../shared/wealth-ledge-button";
import { WealthOverlapHero } from "../shared/wealth-overlap-hero";
import { WealthSection } from "../shared/wealth-section";

type Props = {
  image: string;
  imageAlt: string;
  heading: string;
  body: string;
  buttonLabel: string;
  buttonUrl: string;
};

/**
 * Meet the Co-ops — the mirrored twin of the mission hero (photo right, card
 * left on desktop). Heading uses the Jost display italic treatment
 * (distinct from the site's standard PT Sans section heading), per
 * design.md's "Jost-italic 35px heading, PT Sans sub-lines" spec.
 */
export function WealthCoopsSection({
  image,
  imageAlt,
  heading,
  body,
  buttonLabel,
  buttonUrl,
}: Props) {
  return (
    <WealthSection sectionAttrs={sectionGroupAttr("homepage", "coops")}>
      <WealthOverlapHero image={image} imageAlt={imageAlt} mirrored>
        <h2
          style={{
            fontFamily: "var(--font-wealth-display)",
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: "clamp(26px, 3.4vw, 35px)",
            lineHeight: 1.2,
            color: "var(--wealth-ink)",
            margin: "0 0 16px",
          }}
        >
          <span {...fieldAttr("wealth.homepage.coops-heading")}>{heading}</span>
        </h2>
        <p
          className="whitespace-pre-line"
          style={{
            fontFamily: "var(--font-wealth-sub)",
            fontSize: "15px",
            lineHeight: 1.6,
            color: "var(--wealth-ink)",
            margin: "0 0 24px",
          }}
        >
          <span {...fieldAttr("wealth.homepage.coops-body")}>{body}</span>
        </p>
        <WealthLedgeButton href={buttonUrl} variant="accent">
          <span {...fieldAttr("wealth.homepage.coops-button-label")}>
            {buttonLabel}
          </span>
        </WealthLedgeButton>
      </WealthOverlapHero>
    </WealthSection>
  );
}
