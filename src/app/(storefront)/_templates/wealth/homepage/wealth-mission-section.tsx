import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { WealthOverlapHero } from "../shared/wealth-overlap-hero";
import { WealthSection } from "../shared/wealth-section";

type Props = {
  image: string;
  imageAlt: string;
  eyebrow: string;
  statement: string;
  /**
   * The homepage orchestrator renders Mission beside Support DCWF in a 2-col
   * desktop region (design.md: "Support DCWF sidebar — narrow right
   * column"), so it supplies the shared container/gutter and per-row
   * padding itself and asks this section to render unpadded/uncontained.
   */
  contained?: boolean;
  className?: string;
};

/**
 * Mission overlap hero — not hideable (design.md: always shown). The eyebrow
 * ("Our Mission") and the italic mission statement are the site's must-keep
 * verbatim copy.
 */
export function WealthMissionSection({
  image,
  imageAlt,
  eyebrow,
  statement,
  contained,
  className,
}: Props) {
  return (
    <WealthSection
      sectionAttrs={sectionGroupAttr("homepage", "mission")}
      contained={contained}
      className={className}
    >
      <WealthOverlapHero image={image} imageAlt={imageAlt}>
        {/* The live site renders this as an italic display heading (sofia-pro
            23px), not a mono eyebrow — keep the display voice. */}
        <h2
          className="mb-3"
          style={{
            fontFamily: "var(--font-wealth-display)",
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: "23px",
            lineHeight: "35px",
            letterSpacing: "0.23px",
            color: "var(--wealth-ink)",
            margin: "0 0 12px",
          }}
        >
          <span {...fieldAttr("wealth.homepage.mission-eyebrow")}>
            {eyebrow}
          </span>
        </h2>
        <p
          style={{
            fontFamily: "var(--font-wealth-sub)",
            fontStyle: "italic",
            fontSize: "21px",
            lineHeight: 1.4,
            letterSpacing: "0.21px",
            color: "var(--wealth-ink)",
            margin: 0,
          }}
        >
          <span {...fieldAttr("wealth.homepage.mission-statement")}>
            {statement}
          </span>
        </p>
      </WealthOverlapHero>
    </WealthSection>
  );
}
