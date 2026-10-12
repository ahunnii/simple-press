import Link from "next/link";

import type { ImpactPortfolioGroup } from "./impact-rows";
import type { ImpactFields } from "./wealth-impact-head";
import {
  fieldAttr,
  listItemAttr,
  sectionGroupAttr,
} from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { WealthReveal } from "../shared/wealth-reveal";
import { WEALTH_IMPACT_KEYS as K } from "./index";
import { WealthRings } from "./wealth-impact-devices";
import { anchorProps, ImpactSectionHead, val } from "./wealth-impact-head";

export const IMPACT_PORTFOLIO_ID = "impact-portfolio";

/** http(s) links leave the site (new tab + screen-reader note). */
export function isImpactExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/**
 * Link used across the report's list-like sections (portfolio names, logo
 * cells, sources): the site's external-link pattern (new tab, `noopener`,
 * sr-only "(opens in new tab)") plus an optional decorative ↗.
 */
export function ImpactLink({
  href,
  className,
  arrow = true,
  children,
}: {
  href: string;
  className?: string;
  /** Trailing decorative ↗ (aria-hidden). Default true. */
  arrow?: boolean;
  children: React.ReactNode;
}) {
  const external = isImpactExternalUrl(href);
  return (
    <Link
      href={href}
      className={cn("wealth-impact-link", className)}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
      {arrow ? (
        <span className="wealth-impact-link__arrow" aria-hidden="true">
          {" "}
          ↗
        </span>
      ) : null}
      {external ? <span className="sr-only"> (opens in new tab)</span> : null}
    </Link>
  );
}

/**
 * 10 · Lending portfolio: paper, rings bottom-right. The head sits in a left
 * column (≥1000px) and one real `<table>` per group sits on the right.
 *
 * Each table's visible first column header is the GROUP name (mono caps,
 * primary), then the industry label, then the group's date label. The
 * `<caption>` repeats the group name and is visually hidden (the header row
 * already shows it, so a visible caption would say it twice). Names are
 * `th scope="row"`. A column with no values in a group is dropped. On phones
 * each row stacks as the name, then "industry · date".
 */
export function WealthImpactPortfolio({
  f,
  number,
  groups,
}: {
  f: ImpactFields;
  number?: number;
  /** `parseImpactPortfolio` output, URLs already route-checked. */
  groups: ImpactPortfolioGroup[];
}) {
  const id = IMPACT_PORTFOLIO_ID;
  const intro = val(f, K.portfolioIntro);
  const detailLabel = val(f, K.portfolioDetailLabel);
  return (
    <section
      {...sectionGroupAttr("impact", "portfolio")}
      {...anchorProps(id, val(f, K.portfolioHeading))}
      className="wealth-section wealth-on-paper wealth-impact-anchor wealth-impact-ringed"
    >
      <WealthRings placement="br" />
      <div className="wealth-container wealth-impact-portfolio">
        <ImpactSectionHead
          sectionId={id}
          number={number}
          headingSize="xl"
          eyebrow={val(f, K.portfolioEyebrow)}
          eyebrowKey={K.portfolioEyebrow}
          heading={val(f, K.portfolioHeading)}
          headingKey={K.portfolioHeading}
        >
          {intro ? (
            <p {...fieldAttr(K.portfolioIntro)} className="wealth-impact-intro">
              {intro}
            </p>
          ) : null}
        </ImpactSectionHead>
        <WealthReveal delay={1} threshold={0} className="wealth-impact-tables">
          {groups.map((g, gi) => {
            const showDetail = g.rows.some((r) => r.detail !== "");
            const showDate = g.rows.some((r) => r.date !== "");
            return (
              // Explicit ARIA roles: the phone layout sets `display: block` on
              // tbody/tr, which makes Safari/VoiceOver drop native table
              // semantics; the roles keep it announced as a table.
              <table
                key={`${g.name}-${gi}`}
                role="table"
                className="wealth-impact-table"
              >
                <caption className="sr-only">
                  {g.name || detailLabel || "Lending portfolio"}
                </caption>
                <thead role="rowgroup">
                  <tr role="row">
                    <th
                      scope="col"
                      role="columnheader"
                      className="wealth-impact-table__group"
                    >
                      {g.name || <span className="sr-only">Name</span>}
                    </th>
                    {showDetail ? (
                      <th
                        scope="col"
                        role="columnheader"
                        {...(detailLabel
                          ? fieldAttr(K.portfolioDetailLabel)
                          : {})}
                      >
                        {detailLabel || (
                          <span className="sr-only">Details</span>
                        )}
                      </th>
                    ) : null}
                    {showDate ? (
                      <th
                        scope="col"
                        role="columnheader"
                        className="wealth-impact-table__date"
                      >
                        {g.dateLabel || <span className="sr-only">Date</span>}
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody role="rowgroup">
                  {g.rows.map((r) => (
                    <tr
                      key={r.id}
                      role="row"
                      {...listItemAttr(K.portfolioItems, r.index)}
                    >
                      <th scope="row" role="rowheader">
                        {r.url ? (
                          <ImpactLink href={r.url}>{r.name}</ImpactLink>
                        ) : (
                          r.name
                        )}
                      </th>
                      {showDetail ? <td role="cell">{r.detail}</td> : null}
                      {showDate ? (
                        <td role="cell" className="wealth-impact-table__date">
                          {r.date}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })}
        </WealthReveal>
      </div>
    </section>
  );
}
