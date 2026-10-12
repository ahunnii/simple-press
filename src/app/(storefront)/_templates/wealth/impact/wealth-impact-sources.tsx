import type { ImpactSource } from "./impact-rows";
import type { ImpactFields } from "./wealth-impact-head";
import { listItemAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { WealthReveal } from "../shared/wealth-reveal";
import { sourceAnchorId } from "./impact-rows";
import { WEALTH_IMPACT_KEYS as K } from "./index";
import { anchorProps, ImpactSectionHead, val } from "./wealth-impact-head";
import { ImpactLink } from "./wealth-impact-portfolio";

export const IMPACT_SOURCES_ID = "impact-sources";

/**
 * 17 · Sources: paper, compact. Head on the left (≥900px), the works-cited
 * `ol` on the right. Each `li` carries `sourceAnchorId(n)` and
 * `tabIndex={-1}`, so a footnote link (`#impact-source-N`) lands on it and
 * the highlight (:target / :focus, region A) shows. The number is a CSS
 * counter in the marker column. A source with a URL links ↗.
 *
 * No "back to text" affordance: footnote links carry no id, so there is
 * nothing to return to without changing the shared footnote renderer.
 */
export function WealthImpactSources({
  f,
  sources,
  number,
}: {
  f: ImpactFields;
  /** `parseImpactSources` output (non-empty), URLs route-checked. */
  sources: ImpactSource[];
  /** Render-order section number (cover = 1). */
  number?: number;
}) {
  const id = IMPACT_SOURCES_ID;
  return (
    <section
      {...sectionGroupAttr("impact", "sources")}
      {...anchorProps(id, val(f, K.sourcesHeading))}
      className="wealth-section wealth-section--tight wealth-on-paper wealth-impact-anchor"
    >
      <div className="wealth-container wealth-impact-sources">
        <ImpactSectionHead
          sectionId={id}
          number={number}
          mark={false}
          headingSize="stub"
          // There is no eyebrow field: the menu label doubles as the eyebrow.
          eyebrow={val(f, K.sourcesNavLabel)}
          eyebrowKey={K.sourcesNavLabel}
          heading={val(f, K.sourcesHeading)}
          headingKey={K.sourcesHeading}
        />
        <WealthReveal delay={1} threshold={0}>
          <ol className="wealth-impact-sources__list">
            {sources.map((s) => (
              <li
                key={s.id}
                id={sourceAnchorId(s.n)}
                tabIndex={-1}
                {...listItemAttr(K.sourcesItems, s.index)}
              >
                <span className="wealth-impact-sources__text">
                  {s.url ? (
                    <ImpactLink href={s.url}>{s.text}</ImpactLink>
                  ) : (
                    s.text
                  )}
                </span>
              </li>
            ))}
          </ol>
        </WealthReveal>
      </div>
    </section>
  );
}
