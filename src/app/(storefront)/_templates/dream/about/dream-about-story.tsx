import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { DreamButton } from "../shared/dream-button";
import { DreamHeading } from "../shared/dream-heading";
import { DreamPhoto } from "../shared/dream-photo";
import { DreamSection } from "../shared/dream-section";

type Props = {
  portrait: string;
  portraitAlt: string;
  quoteLead: string;
  quoteAccent: string;
  paragraph1: string;
  paragraph2: string;
  ctaLabel: string;
  ctaUrl: string;
};

/**
 * "Your dreams become a theme." — portrait left (4:5, `DreamPhoto`), the
 * pull-quote + two-paragraph story + CTA right (design.md "About › Story").
 * Not hideable — this is the page's load-bearing content.
 */
export function DreamAboutStory({
  portrait,
  portraitAlt,
  quoteLead,
  quoteAccent,
  paragraph1,
  paragraph2,
  ctaLabel,
  ctaUrl,
}: Props) {
  return (
    <DreamSection
      sectionAttrs={sectionGroupAttr("about", "story")}
      aria-label="Selest's story"
    >
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <DreamPhoto
          src={portrait}
          alt={portraitAlt}
          aspect="4 / 5"
          className="mx-auto w-full max-w-[420px]"
          fallbackMessage="Selest's portrait is on its way"
        />
        <div className="max-w-[60ch]">
          <DreamHeading
            as="h2"
            accent={quoteAccent}
            fieldKey="dream.about.story-quote-lead"
            accentFieldKey="dream.about.story-quote-accent"
          >
            {quoteLead}
          </DreamHeading>
          <p
            className="mt-6 text-[var(--dream-soft)]"
            {...fieldAttr("dream.about.story-paragraph-1")}
          >
            {paragraph1}
          </p>
          <p
            className="mt-4 text-[var(--dream-soft)]"
            {...fieldAttr("dream.about.story-paragraph-2")}
          >
            {paragraph2}
          </p>
          <div className="mt-8">
            <DreamButton href={ctaUrl} variant="primary">
              <span {...fieldAttr("dream.about.story-cta-label")}>
                {ctaLabel}
              </span>
            </DreamButton>
          </div>
        </div>
      </div>
    </DreamSection>
  );
}
