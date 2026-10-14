import { Heart } from "lucide-react";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { WealthCtaBand } from "../shared/wealth-cta-band";
import { WealthLedgeButton } from "../shared/wealth-ledge-button";

type Props = {
  eyebrow: string;
  heading: string;
  body: string;
  buttonLabel: string;
  /** Decorative photo behind the band; "" = plain forest. */
  image: string;
};

/**
 * Support band — forest CTA band: label, italic line, body and a DONATE
 * button to /donate. The orchestrator renders it only while the donations
 * flag is on and the section is visible.
 */
export function WealthSupportSection({
  eyebrow,
  heading,
  body,
  buttonLabel,
  image,
}: Props) {
  const hasHeading = heading.trim() !== "";
  return (
    <WealthCtaBand
      {...sectionGroupAttr("homepage", "support")}
      aria-labelledby={hasHeading ? "wealth-support-h" : undefined}
      headingId="wealth-support-h"
      bgImage={image}
      eyebrow={eyebrow.trim() || undefined}
      eyebrowProps={fieldAttr("wealth.homepage.support-eyebrow")}
      heading={heading}
      headingProps={fieldAttr("wealth.homepage.support-heading")}
      body={body.trim() || undefined}
      bodyProps={fieldAttr("wealth.homepage.support-body")}
      action={
        buttonLabel.trim() ? (
          <WealthLedgeButton href="/donate" variant="donate" onDark>
            <Heart aria-hidden="true" className="size-4" />
            <span {...fieldAttr("wealth.homepage.support-button-label")}>
              {buttonLabel}
            </span>
          </WealthLedgeButton>
        ) : undefined
      }
    />
  );
}
