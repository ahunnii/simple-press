import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { WealthLink } from "../shared/wealth-link";

const CONSULT_PHRASE = "Book a consult";

/**
 * Splits `body` on the literal phrase "Book a consult" and renders that
 * phrase as a `WealthLink` to `url`, keeping the rest of the sentence as
 * plain text. Falls back to plain text if an owner edits the phrase away.
 */
function renderBodyWithConsultLink(body: string, url: string) {
  const index = body.indexOf(CONSULT_PHRASE);
  if (index === -1 || !url) return body;

  const before = body.slice(0, index);
  const after = body.slice(index + CONSULT_PHRASE.length);

  return (
    <>
      {before}
      <WealthLink href={url}>{CONSULT_PHRASE}</WealthLink>
      {after}
    </>
  );
}

type Pathway = {
  title: string;
  body: string;
  url: string;
  titleKey: string;
  bodyKey: string;
};

type Props = {
  heading: string;
  intro1: string;
  intro2: string;
  pathways: Pathway[];
  closingLine: string;
};

/**
 * 2-column "Contact & Office Hours" hero: left is the H1 + intro copy,
 * right is three italic "I want to…" pathway blocks each with a "Book a
 * consult" link, then a closing italic line. Not hideable.
 */
export function WealthContactHero({
  heading,
  intro1,
  intro2,
  pathways,
  closingLine,
}: Props) {
  return (
    <section
      aria-label="Contact & Office Hours"
      {...sectionGroupAttr("contact", "hero")}
      className="py-[calc(var(--wealth-rhythm)*2)]"
    >
      <div className="mx-auto grid w-full max-w-[var(--wealth-container)] grid-cols-1 gap-[calc(var(--wealth-rhythm)*1.5)] px-[var(--wealth-gutter)] lg:grid-cols-[1fr_1.6fr]">
        <div>
          <h1
            {...fieldAttr("wealth.contact.hero-heading")}
            className="wealth-h1"
          >
            {heading}
          </h1>
          <p
            {...fieldAttr("wealth.contact.hero-intro-1")}
            className="mt-[var(--wealth-rhythm)]"
          >
            {intro1}
          </p>
          {intro2 ? (
            <p
              {...fieldAttr("wealth.contact.hero-intro-2")}
              className="mt-[var(--wealth-rhythm)]"
            >
              {intro2}
            </p>
          ) : null}
        </div>

        <div>
          {pathways.map((pathway, i) => (
            <div key={i} className={i > 0 ? "mt-[var(--wealth-rhythm)]" : ""}>
              <h2
                {...fieldAttr(pathway.titleKey)}
                className="wealth-section-heading"
              >
                {pathway.title}
              </h2>
              <p
                {...fieldAttr(pathway.bodyKey)}
                className="mt-[var(--wealth-rhythm)]"
              >
                {renderBodyWithConsultLink(pathway.body, pathway.url)}
              </p>
            </div>
          ))}

          {closingLine ? (
            <p
              {...fieldAttr("wealth.contact.closing-line")}
              className="mt-[var(--wealth-rhythm)] italic"
              style={{ fontFamily: "var(--font-wealth-sub)" }}
            >
              {closingLine}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
