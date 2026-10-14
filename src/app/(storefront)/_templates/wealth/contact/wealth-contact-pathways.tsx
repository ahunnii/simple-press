import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { WealthBlock } from "../shared/wealth-block";
import { WealthLink } from "../shared/wealth-link";
import { WealthProgramCard } from "../shared/wealth-program-card";
import { WealthRevealGroup } from "../shared/wealth-reveal";

const CONSULT_PHRASE = "Book a consult";
const PATHWAY_TONES = ["forest", "primary", "sage"] as const;

/**
 * Renders `body` as plain text, except — when a card has no button of its
 * own but does have a link — the literal phrase "Book a consult" becomes an
 * inline link (the original treatment). Falls back to plain text when the
 * owner edits the phrase away.
 */
function renderBody(body: string, url: string, hasButton: boolean) {
  if (hasButton || !url) return body;
  const index = body.indexOf(CONSULT_PHRASE);
  if (index === -1) return body;
  return (
    <>
      {body.slice(0, index)}
      <WealthLink href={url}>{CONSULT_PHRASE}</WealthLink>
      {body.slice(index + CONSULT_PHRASE.length)}
    </>
  );
}

export type WealthContactPathway = {
  title: string;
  body: string;
  url: string;
  titleKey: string;
  bodyKey: string;
};

type Props = {
  pathways: WealthContactPathway[];
  /** Label on each card's button; blank = no buttons. */
  ctaLabel: string;
};

/**
 * Pathways — three numbered color cards ("I want to…") with a consult
 * button each. A card with a blank title is skipped; none left → nothing
 * renders. Hideable (contact.pathways).
 */
export function WealthContactPathways({ pathways, ctaLabel }: Props) {
  const shown = pathways.filter((p) => p.title.trim() !== "");
  if (shown.length === 0) return null;

  return (
    <WealthBlock
      tone="paper"
      aria-label="Ways we can help"
      {...sectionGroupAttr("contact", "pathways")}
    >
      <WealthRevealGroup
        className={`wealth-programs wealth-contact-pathways wealth-contact-pathways--${shown.length}`}
        threshold={0}
      >
        {shown.map((p, i) => {
          const hasButton = ctaLabel.trim() !== "" && p.url !== "";
          const external = /^https?:\/\//i.test(p.url);
          return (
            <WealthProgramCard
              key={p.titleKey}
              className="wealth-reveal-item"
              style={{ "--i": Math.min(i, 7) } as React.CSSProperties}
              tone={PATHWAY_TONES[i % PATHWAY_TONES.length] ?? "forest"}
              number={String(i + 1).padStart(2, "0")}
              title={p.title}
              titleAs="h2"
              titleProps={fieldAttr(p.titleKey)}
              copy={renderBody(p.body, p.url, hasButton)}
              copyProps={fieldAttr(p.bodyKey)}
              cta={
                hasButton
                  ? {
                      href: p.url,
                      external,
                      label: (
                        <>
                          <span
                            {...fieldAttr("wealth.contact.pathway-cta-label")}
                          >
                            {ctaLabel}
                          </span>
                          {external ? (
                            <span aria-hidden="true"> &#8599;</span>
                          ) : null}
                          {/* Three identical "Book a consult" buttons need a
                              distinct accessible name. */}
                          <span className="sr-only"> — {p.title}</span>
                        </>
                      ),
                    }
                  : null
              }
            />
          );
        })}
      </WealthRevealGroup>
    </WealthBlock>
  );
}
