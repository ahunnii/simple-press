import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

type Props = {
  heading: string;
  paragraph1: string;
  paragraph2: string;
  paragraph3: string;
};

/**
 * "About DCWF" — the page's H1 (styled as the site's italic centered
 * section-heading whisper per design.md), followed by the three verbatim
 * story paragraphs. Not hideable.
 */
export function WealthAboutHero({
  heading,
  paragraph1,
  paragraph2,
  paragraph3,
}: Props) {
  return (
    <section
      aria-label="About DCWF"
      {...sectionGroupAttr("about", "hero")}
      className="py-[calc(var(--wealth-rhythm)*2)]"
    >
      <div className="mx-auto w-full max-w-[720px] px-[var(--wealth-gutter)] text-center">
        <h1
          {...fieldAttr("wealth.about.hero-heading")}
          className="wealth-section-heading"
        >
          {heading}
        </h1>
        <div className="mt-[var(--wealth-rhythm)] text-left">
          {[paragraph1, paragraph2, paragraph3].map((paragraph, i) => (
            <p
              key={i}
              {...fieldAttr(
                i === 0
                  ? "wealth.about.hero-paragraph-1"
                  : i === 1
                    ? "wealth.about.hero-paragraph-2"
                    : "wealth.about.hero-paragraph-3",
              )}
              className="mt-[var(--wealth-rhythm)] first:mt-0"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
