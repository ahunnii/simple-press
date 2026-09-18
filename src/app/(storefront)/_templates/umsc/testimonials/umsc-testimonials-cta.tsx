import { sectionGroupAttr } from "~/lib/preview/section-attrs";

import { UmscButton } from "../shared/umsc-button";
import { UmscGoogleReviewLink } from "../shared/umsc-google-review-link";
import { UmscHeading } from "../shared/umsc-heading";
import { UmscLede } from "../shared/umsc-lede";
import { UmscReveal } from "../shared/umsc-reveal";
import { UmscSection } from "../shared/umsc-section";

type Props = {
  heading: string;
  body: string;
  buttonLabel: string;
  googleReviewUrl: string;
};

/**
 * UmscTestimonialsCta — design.md "Testimonials": "Had an order from us?"
 * band with the Google-review link + a pill to /testimonials/submit.
 * Hideable (testimonials.cta).
 */
export function UmscTestimonialsCta({
  heading,
  body,
  buttonLabel,
  googleReviewUrl,
}: Props) {
  if (!heading && !body) return null;

  return (
    <UmscSection
      tone="cream"
      aria-label="Share your experience"
      sectionAttrs={sectionGroupAttr("testimonials", "cta")}
    >
      <UmscReveal className="mx-auto flex max-w-[620px] flex-col items-center gap-5 text-center">
        {heading && (
          <UmscHeading as="h2" fieldKey="umsc.testimonials.cta-heading">
            {heading}
          </UmscHeading>
        )}
        {body && (
          <UmscLede
            fieldKey="umsc.testimonials.cta-body"
            className="text-center"
          >
            {body}
          </UmscLede>
        )}
        <div className="mt-3 flex flex-col items-center gap-5">
          {buttonLabel && (
            <UmscButton
              as="link"
              href="/testimonials/submit"
              variant="gold"
              fieldKey="umsc.testimonials.cta-button-label"
            >
              {buttonLabel}
            </UmscButton>
          )}
          <UmscGoogleReviewLink href={googleReviewUrl} />
        </div>
      </UmscReveal>
    </UmscSection>
  );
}
