import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { WealthArrowLink } from "../shared/wealth-arrow-link";
import { WealthLedgeButton } from "../shared/wealth-ledge-button";
import { WealthSplitHero } from "../shared/wealth-split-hero";

type Props = {
  image: string;
  imageAlt: string;
  eyebrow: string;
  statement: string;
  /** Button label + href. Either blank hides the button. */
  ctaLabel: string;
  ctaHref: string;
  /** Text link beside the button. Either blank hides the link. */
  linkLabel: string;
  linkHref: string;
};

/**
 * Split hero — forest-tinted mission photo (≈2/3) + forest panel: mono label,
 * italic mission statement, LEARN MORE button and a secondary arrow link.
 * Always shown. The page's single h1 is the sr-only business name in the
 * orchestrator, so the statement is a paragraph.
 */
export function WealthMissionSection({
  image,
  imageAlt,
  eyebrow,
  statement,
  ctaLabel,
  ctaHref,
  linkLabel,
  linkHref,
}: Props) {
  const showCta = ctaLabel.trim() !== "" && ctaHref !== "";
  const showLink = linkLabel.trim() !== "" && linkHref !== "";
  return (
    <WealthSplitHero
      {...sectionGroupAttr("homepage", "mission")}
      aria-label={eyebrow.trim() || "Mission"}
      image={image}
      imageAlt={imageAlt}
      imagePosition="38% 50%"
    >
      {eyebrow.trim() ? (
        <p
          className="wealth-eyebrow"
          {...fieldAttr("wealth.homepage.mission-eyebrow")}
        >
          {eyebrow}
        </p>
      ) : null}
      <hr aria-hidden="true" className="wealth-hero__rule" />
      <p
        className="wealth-hero__statement"
        {...fieldAttr("wealth.homepage.mission-statement")}
      >
        {statement}
      </p>
      {showCta || showLink ? (
        <div className="wealth-btn-row">
          {showCta ? (
            <WealthLedgeButton href={ctaHref} onDark>
              <span {...fieldAttr("wealth.homepage.mission-cta-label")}>
                {ctaLabel}
              </span>
            </WealthLedgeButton>
          ) : null}
          {showLink ? (
            <WealthArrowLink href={linkHref}>
              <span {...fieldAttr("wealth.homepage.mission-link-label")}>
                {linkLabel}
              </span>
            </WealthArrowLink>
          ) : null}
        </div>
      ) : null}
    </WealthSplitHero>
  );
}
