import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { WealthCtaBand } from "../shared/wealth-cta-band";
import { WealthLedgeButton } from "../shared/wealth-ledge-button";
import { WealthReveal } from "../shared/wealth-reveal";

type Props = {
  heading: string;
  label: string;
  url: string;
};

/** Closing forest band → Contact. Hideable (about.cta). */
export function WealthAboutCta({ heading, label, url }: Props) {
  const hasHeading = heading.trim() !== "";
  const hasButton = label.trim() !== "";
  if (!hasHeading && !hasButton) return null;

  return (
    <WealthReveal>
      <WealthCtaBand
        aria-labelledby={hasHeading ? "wealth-about-cta-h" : undefined}
        aria-label={hasHeading ? undefined : "Contact us"}
        headingId="wealth-about-cta-h"
        heading={hasHeading ? heading : ""}
        headingProps={fieldAttr("wealth.about.cta-heading")}
        action={
          hasButton ? (
            <WealthLedgeButton href={url || "/contact"} onDark>
              <span {...fieldAttr("wealth.about.cta-label")}>{label}</span>
            </WealthLedgeButton>
          ) : undefined
        }
        {...sectionGroupAttr("about", "cta")}
      />
    </WealthReveal>
  );
}
