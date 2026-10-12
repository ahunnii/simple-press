import type { ImpactSupportWay } from "./impact-rows";
import type { ImpactFields } from "./wealth-impact-head";
import {
  fieldAttr,
  listItemAttr,
  sectionGroupAttr,
} from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { WealthLedgeButton } from "../shared/wealth-ledge-button";
import { WealthReveal } from "../shared/wealth-reveal";
import { ImpactParagraphs } from "./impact-markup";
import { WEALTH_IMPACT_KEYS as K } from "./index";
import { ImpactBleedPhoto, WealthRings } from "./wealth-impact-devices";
import { anchorProps, ImpactSectionHead, val } from "./wealth-impact-head";

export const IMPACT_SUPPORT_ID = "impact-support";

/**
 * 16 · Ways to support: sage, rings top-left. Left column: head, the ways as
 * an `ol` of square forest numeral badges (mono caps title + line), the
 * closing paragraph (`**bold lead**` + footnotes) and an optional forest
 * ledge button. Right: `support-image` half-bleed, full colour. With no
 * image the ways run in two columns across the container.
 */
export function WealthImpactSupport({
  f,
  ways,
  buttonHref,
  number,
  sourceCount = 0,
}: {
  f: ImpactFields;
  /** `parseImpactSupport` output (non-empty). */
  ways: ImpactSupportWay[];
  /**
   * Flag-checked href for the button (the page applies `liveHref`).
   * `null`/empty hides the button.
   */
  buttonHref?: string | null;
  /** Render-order section number (cover = 1). */
  number?: number;
  /** Rendered sources (0 when the Sources section is hidden). */
  sourceCount?: number;
}) {
  const id = IMPACT_SUPPORT_ID;
  const image = val(f, K.supportImage);
  const closing = val(f, K.supportClosing);
  const buttonLabel = val(f, K.supportButtonLabel);
  const hasImage = image !== "";
  return (
    <section
      {...sectionGroupAttr("impact", "support")}
      {...anchorProps(id, val(f, K.supportHeading))}
      className={cn(
        "wealth-section wealth-on-sage wealth-impact-anchor wealth-impact-ringed",
        hasImage && "wealth-impact-bleed wealth-impact-bleed--right",
      )}
    >
      <WealthRings placement="tl" />
      {hasImage ? (
        <ImpactBleedPhoto src={image} alt={val(f, K.supportImageAlt)} reveal />
      ) : null}
      <div className="wealth-container">
        <div
          className={cn(
            "wealth-impact-support",
            hasImage && "wealth-impact-bleed__text",
          )}
        >
          <ImpactSectionHead
            sectionId={id}
            number={number}
            headingSize="xl"
            eyebrow={val(f, K.supportEyebrow)}
            eyebrowKey={K.supportEyebrow}
            heading={val(f, K.supportHeading)}
            headingKey={K.supportHeading}
          />
          {ways.length > 0 ? (
            <WealthReveal
              delay={1}
              threshold={0}
              className="wealth-impact-ways-wrap"
            >
              <ol
                className={cn(
                  "wealth-impact-ways",
                  !hasImage && "wealth-impact-ways--grid",
                )}
              >
                {ways.map((w, i) => (
                  <li key={w.id} {...listItemAttr(K.supportItems, w.index)}>
                    <span className="wealth-impact-ways__no" aria-hidden="true">
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="wealth-impact-ways__title">{w.title}</h3>
                      {w.line ? <p>{w.line}</p> : null}
                    </div>
                  </li>
                ))}
              </ol>
            </WealthReveal>
          ) : null}
          {closing ? (
            // Textarea with **bold** + footnotes: no fieldAttr (live patch
            // would flatten the markup).
            <WealthReveal className="wealth-impact-closing">
              <ImpactParagraphs text={closing} sourceCount={sourceCount} />
            </WealthReveal>
          ) : null}
          {buttonHref && buttonLabel ? (
            <WealthReveal className="wealth-impact-closing__cta">
              <WealthLedgeButton href={buttonHref} variant="forest">
                <span {...fieldAttr(K.supportButtonLabel)}>{buttonLabel}</span>
              </WealthLedgeButton>
            </WealthReveal>
          ) : null}
        </div>
      </div>
    </section>
  );
}
