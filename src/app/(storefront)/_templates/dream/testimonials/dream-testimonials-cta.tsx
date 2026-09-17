import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { DreamButton } from "../shared/dream-button";
import { DreamHeading } from "../shared/dream-heading";
import { DreamSection } from "../shared/dream-section";

type Props = {
  heading: string;
  body: string;
  buttonLabel: string;
};

/** "Had an event with Selest?" → /testimonials/submit. Hideable (testimonials.cta). */
export function DreamTestimonialsCta({ heading, body, buttonLabel }: Props) {
  return (
    <DreamSection
      sectionAttrs={sectionGroupAttr("testimonials", "cta")}
      aria-label="Share your story"
    >
      <div className="mx-auto max-w-[600px] text-center">
        <DreamHeading as="h2" fieldKey="dream.testimonials.cta-heading">
          {heading}
        </DreamHeading>
        {body ? (
          <p
            className="mt-4 text-[var(--dream-soft)]"
            {...fieldAttr("dream.testimonials.cta-body")}
          >
            {body}
          </p>
        ) : null}
        <div className="mt-8">
          <DreamButton href="/testimonials/submit" variant="primary">
            <span {...fieldAttr("dream.testimonials.cta-button-label")}>
              {buttonLabel}
            </span>
          </DreamButton>
        </div>
      </div>
    </DreamSection>
  );
}
