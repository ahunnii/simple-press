import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { WealthLedgeButton } from "../shared/wealth-ledge-button";

type Props = {
  heading: string;
  body: string;
  buttonLabel: string;
};

/** Closing "share your story" CTA → /testimonials/submit. Hideable (testimonials.cta). */
export function WealthTestimonialsCta({ heading, body, buttonLabel }: Props) {
  return (
    <section
      aria-label="Share your story"
      {...sectionGroupAttr("testimonials", "cta")}
      className="py-[calc(var(--wealth-rhythm)*2)]"
    >
      <div className="mx-auto w-full max-w-[640px] px-[var(--wealth-gutter)] text-center">
        <h2
          {...fieldAttr("wealth.testimonials.cta-heading")}
          className="wealth-section-heading"
        >
          {heading}
        </h2>
        {body ? (
          <p
            {...fieldAttr("wealth.testimonials.cta-body")}
            className="mt-[var(--wealth-rhythm)]"
          >
            {body}
          </p>
        ) : null}
        {buttonLabel ? (
          <div className="mt-[var(--wealth-rhythm)]">
            <WealthLedgeButton href="/testimonials/submit" variant="accent">
              <span {...fieldAttr("wealth.testimonials.cta-button-label")}>
                {buttonLabel}
              </span>
            </WealthLedgeButton>
          </div>
        ) : null}
      </div>
    </section>
  );
}
