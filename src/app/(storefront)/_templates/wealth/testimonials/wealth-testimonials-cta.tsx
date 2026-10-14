import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { WealthCtaBand } from "../shared/wealth-cta-band";
import { WealthLedgeButton } from "../shared/wealth-ledge-button";
import { WealthReveal } from "../shared/wealth-reveal";

type Props = {
  heading: string;
  body: string;
  buttonLabel: string;
};

/** Share your story — forest band → /testimonials/submit. Hideable. */
export function WealthTestimonialsCta({ heading, body, buttonLabel }: Props) {
  const hasHeading = heading.trim() !== "";
  const hasBody = body.trim() !== "";
  const hasButton = buttonLabel.trim() !== "";
  if (!hasHeading && !hasBody && !hasButton) return null;

  return (
    <WealthReveal>
      <WealthCtaBand
        aria-labelledby={hasHeading ? "wealth-testimonials-cta-h" : undefined}
        aria-label={hasHeading ? undefined : "Share your story"}
        headingId="wealth-testimonials-cta-h"
        heading={hasHeading ? heading : ""}
        headingProps={fieldAttr("wealth.testimonials.cta-heading")}
        body={hasBody ? body : undefined}
        bodyProps={fieldAttr("wealth.testimonials.cta-body")}
        action={
          hasButton ? (
            <WealthLedgeButton href="/testimonials/submit" onDark>
              <span {...fieldAttr("wealth.testimonials.cta-button-label")}>
                {buttonLabel}
              </span>
            </WealthLedgeButton>
          ) : undefined
        }
        {...sectionGroupAttr("testimonials", "cta")}
      />
    </WealthReveal>
  );
}
