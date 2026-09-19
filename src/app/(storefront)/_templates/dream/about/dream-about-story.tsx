import type { RichTextFieldValue } from "~/lib/template-fields";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isContentEmpty } from "~/lib/template-fields";
import { cn } from "~/lib/utils";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { DREAM_PROSE_CLASSNAME } from "../generic/dream-generic-page";
import { DreamButton } from "../shared/dream-button";
import { DreamHeading } from "../shared/dream-heading";
import { DreamPhoto } from "../shared/dream-photo";
import { DreamSection } from "../shared/dream-section";

type Props = {
  portrait: string;
  portraitAlt: string;
  quoteLead: string;
  quoteAccent: string;
  storyBody: RichTextFieldValue | null;
  ctaLabel: string;
  ctaUrl: string;
};

// Rich text is the only story authoring path; the shipped copy below is a
// constant so a fresh store still reads day-one (mirrors the pink pattern).
const DEFAULT_STORY_PARAGRAPHS: string[] = [
  "Selest is an event designer, not a planner. Give her the shape of your day and she'll build a world around it — drape by drape, chair by chair, until the space matches what you imagined.",
  "The best part of the job, she says, is watching guests walk in and see their theme for the first time. That's the smile she's designing for.",
];

// Overrides `DREAM_PROSE_CLASSNAME` to match this section's existing look:
// the parent column already caps the measure at 60ch, the section uses the
// softer body tone (not ink) at its own type scale, and the pt-based rhythm
// mirrors the section's old mt-6 / mt-4 spacing (padding, not margin — see
// the comment above `DREAM_PROSE_CLASSNAME` on why `.dream p` forces
// margin: 0).
const DREAM_STORY_PROSE = cn(
  DREAM_PROSE_CLASSNAME,
  "max-w-none",
  "prose-p:text-[var(--dream-soft)]",
  "prose-p:text-[inherit] prose-p:leading-[inherit]",
  "prose-p:pt-4 [&>:first-child]:pt-6",
);

/**
 * "Your dreams become a theme." — portrait left (4:5, `DreamPhoto`), the
 * pull-quote + rich-text story + CTA right (design.md "About › Story").
 * Not hideable — this is the page's load-bearing content.
 */
export function DreamAboutStory({
  portrait,
  portraitAlt,
  quoteLead,
  quoteAccent,
  storyBody,
  ctaLabel,
  ctaUrl,
}: Props) {
  const hasStoryRichText = storyBody != null && !isContentEmpty(storyBody);

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
          {hasStoryRichText ? (
            <TiptapRenderer content={storyBody} className={DREAM_STORY_PROSE} />
          ) : (
            <>
              {DEFAULT_STORY_PARAGRAPHS.map((paragraph, index) => (
                <p
                  key={paragraph}
                  className={cn(
                    "text-[var(--dream-soft)]",
                    index === 0 ? "mt-6" : "mt-4",
                  )}
                >
                  {paragraph}
                </p>
              ))}
            </>
          )}
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
