import {
  OliveButton,
  OliveLeafMark,
  OliveReveal,
  OliveSection,
} from "../shared";

type Props = {
  quote: string;
  author: string;
  linkLabel: string;
  linkHref: string;
  sectionAttrs?: Record<string, string>;
  linkLabelFieldKey?: string;
};

/**
 * One approved review, printed large on the slate card — the quiet stock the
 * editorial pages use, so the page pauses here before the journal.
 *
 * There is no heading: the quote is the section. The reviewer's name is real
 * and comes from the review itself; nothing on this card is owner-authored
 * copy, which is why the whole section disappears when there is no approved
 * review to show.
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
      tone="paper"
      aria-label="What customers say"
      {...sectionAttrs}
    >
      <OliveReveal
        className="flex flex-col items-start gap-6"
        style={{
          backgroundColor: "var(--olive-slate)",
          borderRadius: "var(--olive-card-radius)",
          padding: "clamp(1.75rem, 5vw, 3.5rem)",
        }}
      >
        <span
          className="flex items-center"
          style={{ color: "var(--olive-ink)" }}
        >
          <OliveLeafMark size={22} />
        </span>

        <blockquote className="m-0 flex max-w-[46ch] flex-col gap-5 p-0">
          <p
            style={{
              fontFamily: "var(--olive-font-display)",
              fontWeight: 300,
              fontSize: "clamp(1.375rem, 1rem + 1.6vw, 2rem)",
              lineHeight: 1.28,
              color: "var(--olive-ink)",
            }}
          >
            {quote}
          </p>

          {author ? (
            <footer>
              <cite
                className="olive-label"
                style={{ color: "var(--olive-ink)", fontStyle: "normal" }}
              >
                {author}
              </cite>
            </footer>
          ) : null}
        </blockquote>

        {linkLabel ? (
          <OliveButton
            variant="ghost"
            href={linkHref}
            data-sp-field={linkLabelFieldKey}
            style={{
              color: "var(--olive-ink)",
              textDecorationColor: "var(--olive-ink)",
            }}
          >
            {linkLabel}
          </OliveButton>
        ) : null}
      </OliveReveal>
    </OliveSection>
  );
}
