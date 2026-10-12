import type { ImpactFinancialGroup } from "./impact-rows";
import type { ImpactFields } from "./wealth-impact-head";
import {
  fieldAttr,
  listItemAttr,
  sectionGroupAttr,
} from "~/lib/preview/section-attrs";

import { WealthReveal } from "../shared/wealth-reveal";
import { WealthStat, WealthStats } from "../shared/wealth-stats";
import { formatShare } from "./impact-rows";
import { WEALTH_IMPACT_KEYS as K } from "./index";
import { ImpactHeadingMark } from "./wealth-impact-devices";
import { anchorProps, formatSectionNumber, val } from "./wealth-impact-head";

export const IMPACT_FINANCIALS_ID = "financials";

type Props = {
  f: ImpactFields;
  groups: ImpactFinancialGroup[];
  /** v2: render-order section number (cover = 1). */
  number?: number;
};

function GroupTable({
  group,
  f,
  caption,
}: {
  group: ImpactFinancialGroup;
  f: ImpactFields;
  caption: string;
}) {
  const hasShare = group.rows.some((r) => r.share !== null);
  return (
    <table className="wealth-impact-bars">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          <th scope="col">{val(f, K.financialsColumnLabel)}</th>
          {hasShare ? (
            <th scope="col">{val(f, K.financialsShareLabel)}</th>
          ) : null}
          <th scope="col">{val(f, K.financialsAmountLabel)}</th>
        </tr>
      </thead>
      <tbody>
        {group.rows.map((r) => (
          <tr key={r.id} {...listItemAttr(K.financialsItems, r.index)}>
            <th scope="row">
              {r.label}
              {r.share !== null && group.maxShare > 0 ? (
                <span
                  className="wealth-impact-bar"
                  aria-hidden="true"
                  style={
                    {
                      "--v":
                        Math.round((r.share / group.maxShare) * 1000) / 1000,
                    } as React.CSSProperties
                  }
                />
              ) : null}
            </th>
            {hasShare ? (
              <td className="wealth-impact-bars__share">
                {r.share !== null ? `${formatShare(r.share)}%` : ""}
              </td>
            ) : null}
            <td className="wealth-impact-bars__amt">{r.amount}</td>
          </tr>
        ))}
      </tbody>
      {group.total !== null ? (
        <tfoot>
          <tr>
            <th scope="row">{val(f, K.financialsTotalLabel)}</th>
            {hasShare ? (
              <td>
                {group.shareTotal !== null
                  ? `${formatShare(group.shareTotal)}%`
                  : ""}
              </td>
            ) : null}
            <td>{group.total}</td>
          </tr>
        </tfoot>
      ) : null}
    </table>
  );
}

/**
 * 8 · Financials: sticky left column (heading, fiscal-year note, up to two
 * headline figures) + one `<details>` accordion per group (first open), each
 * holding an accessible table: caption, column + row headers, square
 * token-colored bars sized relative to the group's largest share (the share
 * and amount stay visible as text), and a total row only when every amount
 * in the group is a plain number.
 */
export function WealthImpactFinancials({ f, groups, number }: Props) {
  const id = IMPACT_FINANCIALS_ID;
  const note = val(f, K.financialsNote);
  const eyebrow = val(f, K.financialsEyebrow);
  const heading = val(f, K.financialsHeading);
  const year = val(f, K.heroYear);
  const headline = [
    { value: K.financialsStat1Value, caption: K.financialsStat1Caption },
    { value: K.financialsStat2Value, caption: K.financialsStat2Caption },
  ].filter((s) => val(f, s.value) !== "");

  return (
    <section
      {...sectionGroupAttr("impact", "financials")}
      {...anchorProps(id, heading)}
      className="wealth-section wealth-on-paper wealth-impact-fin wealth-impact-anchor"
    >
      <div className="wealth-container wealth-impact-fin__grid">
        {/* First grid child = the sticky column (≥1000px, CSS). */}
        <WealthReveal>
          {eyebrow ? (
            <p className="wealth-eyebrow wealth-eyebrow--block">
              {number !== undefined ? (
                <span className="wealth-impact-no" aria-hidden="true">
                  {formatSectionNumber(number)}
                  {" · "}
                </span>
              ) : null}
              <span {...fieldAttr(K.financialsEyebrow)}>{eyebrow}</span>
            </p>
          ) : null}
          {heading ? (
            <h2
              {...fieldAttr(K.financialsHeading)}
              id={`${id}-h`}
              className="wealth-h2 wealth-impact-h2"
            >
              {heading}
            </h2>
          ) : null}
          {heading ? <ImpactHeadingMark /> : null}
          {note ? (
            <p
              {...fieldAttr(K.financialsNote)}
              className="wealth-impact-fin__note"
            >
              {note}
            </p>
          ) : null}
          {headline.length > 0 ? (
            <WealthStats>
              {headline.map((s) => (
                <WealthStat
                  key={s.value}
                  value={val(f, s.value)}
                  valueProps={fieldAttr(s.value)}
                  caption={val(f, s.caption) || undefined}
                  captionProps={fieldAttr(s.caption)}
                />
              ))}
            </WealthStats>
          ) : null}
        </WealthReveal>
        <WealthReveal delay={1} threshold={0} className="wealth-impact-acc">
          {groups.map((g, gi) => (
            <details
              key={`${g.name}-${gi}`}
              className="wealth-impact-acc__item"
              open={gi === 0}
            >
              <summary>
                <span className="wealth-impact-acc__title">{g.name}</span>
                {g.total !== null ? (
                  <span className="wealth-impact-acc__total">{g.total}</span>
                ) : null}
                <span className="wealth-impact-acc__icon" aria-hidden="true" />
              </summary>
              <div className="wealth-impact-acc__body">
                <GroupTable
                  group={g}
                  f={f}
                  caption={year ? `${g.name}, ${year}` : g.name}
                />
              </div>
            </details>
          ))}
        </WealthReveal>
      </div>
    </section>
  );
}
