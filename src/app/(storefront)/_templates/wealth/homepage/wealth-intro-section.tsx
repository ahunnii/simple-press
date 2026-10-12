import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { WealthBlock } from "../shared/wealth-block";
import { WealthEyebrow } from "../shared/wealth-eyebrow";
import { WealthReveal } from "../shared/wealth-reveal";
import { renderBoldMarkup } from "./wealth-bold-markup";

type Props = {
  eyebrow: string;
  heading: string;
  /** Lead paragraph; `**double asterisks**` render as bold. */
  lead: string;
  /** `flush-bottom` when the program cards follow on the same paper. */
  spacing: "default" | "flush-bottom";
};

/**
 * Intro — centered label + italic H2 + lead paragraph with bold key phrases.
 * The H2 is the heading for the program cards below it.
 */
export function WealthIntroSection({ eyebrow, heading, lead, spacing }: Props) {
  const hasHeading = heading.trim() !== "";
  return (
    <WealthBlock
      tone="paper"
      spacing={spacing}
      aria-labelledby={hasHeading ? "wealth-intro-h" : undefined}
      {...sectionGroupAttr("homepage", "intro")}
    >
      <WealthReveal className="wealth-section-head wealth-section-head--center">
        {eyebrow.trim() ? (
          <WealthEyebrow
            as="p"
            className="wealth-eyebrow--block"
            {...fieldAttr("wealth.homepage.intro-eyebrow")}
          >
            {eyebrow}
          </WealthEyebrow>
        ) : null}
        {hasHeading ? (
          <h2
            className="wealth-h2"
            id="wealth-intro-h"
            {...fieldAttr("wealth.homepage.intro-heading")}
          >
            {heading}
          </h2>
        ) : null}
        {/* No fieldAttr here: the text is transformed (`**` → <strong>), so
            a live textContent patch would show raw asterisks. */}
        {lead.trim() ? (
          <p className="wealth-lead mt-6">{renderBoldMarkup(lead)}</p>
        ) : null}
      </WealthReveal>
    </WealthBlock>
  );
}
