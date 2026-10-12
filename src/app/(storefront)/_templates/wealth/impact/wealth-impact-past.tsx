import type { ImpactPastReport } from "./impact-rows";
import type { ImpactFields } from "./wealth-impact-head";
import { listItemAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { WealthArrowLink } from "../shared/wealth-arrow-link";
import { WealthReveal } from "../shared/wealth-reveal";
import { WEALTH_IMPACT_KEYS as K } from "./index";
import { anchorProps, ImpactSectionHead, val } from "./wealth-impact-head";

export const IMPACT_PAST_ID = "past-reports";

/**
 * Past reports (the year archive): the compact reference layout shared with
 * Sources (v2 mock, item 18): head left, a hairline-ruled stack of arrow
 * links right on wide screens; stacked on phones.
 */
export function WealthImpactPast({
  f,
  reports,
  number,
}: {
  f: ImpactFields;
  reports: ImpactPastReport[];
  /** v2: render-order section number (cover = 1). */
  number?: number;
}) {
  const id = IMPACT_PAST_ID;
  return (
    <section
      {...sectionGroupAttr("impact", "past")}
      {...anchorProps(id, val(f, K.pastHeading))}
      className="wealth-section wealth-section--tight wealth-on-paper wealth-impact-anchor"
    >
      <div className="wealth-container wealth-impact-sources">
        <ImpactSectionHead
          sectionId={id}
          number={number}
          mark={false}
          headingSize="stub"
          eyebrow={val(f, K.pastEyebrow)}
          eyebrowKey={K.pastEyebrow}
          heading={val(f, K.pastHeading)}
          headingKey={K.pastHeading}
        />
        <WealthReveal delay={1} threshold={0}>
          <ul className="wealth-impact-past__list">
            {reports.map((r) => (
              <li key={r.id} {...listItemAttr(K.pastItems, r.index)}>
                <WealthArrowLink href={r.url}>{r.label}</WealthArrowLink>
              </li>
            ))}
          </ul>
        </WealthReveal>
      </div>
    </section>
  );
}
