import { OliveButton, OliveReveal, OliveSection } from "../shared";

type Props = {
  quote: string;
  author: string;
  linkLabel: string;
  linkHref: string;
  sectionAttrs?: Record<string, string>;
  linkLabelFieldKey?: string;
};

/**
 * One approved review, set as an editorial pull-quote: Bodoni italic, centred
 * on a sand band, the reviewer's name in tracked caps under a short stone
 * rule, and a quiet link to the rest. No card, no mark — the words are the
 * section.
 *
 * Nothing here is owner-authored copy except the link, which is why the whole
 * section disappears when there is no approved review to show.
 */
export function OliveTestimonialSection({
  quote,
  author,
  linkLabel,
  linkHref,
  sectionAttrs,
  linkLabelFieldKey,
}: Props) {
  if (!quote.trim()) return null;

  return (
    <OliveSection
      bleed
      tone="sand"
      aria-label="What customers say"
      {...sectionAttrs}
    >
      <OliveReveal className="mx-auto flex max-w-[52rem] flex-col items-center gap-8 text-center">
        <figure className="m-0 flex flex-col items-center gap-7">
          <blockquote className="m-0 p-0">
            <p className="olive-pull-quote">{quote}</p>
          </blockquote>

          {author ? (
            <figcaption className="flex flex-col items-center gap-4">
              <span
                aria-hidden="true"
                className="block h-px w-10"
                style={{ backgroundColor: "var(--olive-stone)" }}
              />
              <cite
                className="olive-label"
                style={{ color: "var(--olive-espresso)", fontStyle: "normal" }}
              >
                {author}
              </cite>
            </figcaption>
          ) : null}
        </figure>

        {linkLabel && linkHref ? (
          <OliveButton
            variant="link"
            arrow
            href={linkHref}
            data-sp-field={linkLabelFieldKey}
          >
            {linkLabel}
          </OliveButton>
        ) : null}
      </OliveReveal>
    </OliveSection>
  );
}
