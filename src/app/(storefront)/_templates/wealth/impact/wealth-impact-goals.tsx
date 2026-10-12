import type { ImpactGoal } from "./impact-rows";
import type { ImpactFields } from "./wealth-impact-head";
import {
  fieldAttr,
  listItemAttr,
  sectionGroupAttr,
} from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { WealthReveal } from "../shared/wealth-reveal";
import { ImpactParagraphs } from "./impact-markup";
import { WEALTH_IMPACT_KEYS as K } from "./index";
import { ImpactBleedPhoto } from "./wealth-impact-devices";
import { anchorProps, ImpactSectionHead, val } from "./wealth-impact-head";

export const IMPACT_GOALS_ID = "goals";

/**
 * 12 · Where we're going / Call to action: paper.
 *
 * - With `goals-image`: a half-bleed full-colour photo on the left; the head
 *   and `goals-intro` (footnotes) on the right.
 * - Without a photo: the head (+ intro) stacks on top.
 * - Either way the goals sit in a forest box (sage ledge): an optional mono
 *   label, then rows of a small sage numeral, a bold title and a line. With
 *   no photo the box spans the container (list in 2–4 columns).
 */
export function WealthImpactGoals({
  f,
  goals,
  number,
  sourceCount = 0,
}: {
  f: ImpactFields;
  goals: ImpactGoal[];
  /** Render-order section number (cover = 1). */
  number?: number;
  /** Rendered sources (0 when the Sources section is hidden). */
  sourceCount?: number;
}) {
  const id = IMPACT_GOALS_ID;
  const image = val(f, K.goalsImage);
  const intro = val(f, K.goalsIntro);
  const listLabel = val(f, K.goalsListLabel);
  const hasImage = image !== "";
  const labelId = `${id}-list-label`;
  const cols = Math.max(1, Math.min(goals.length, 4));

  return (
    <section
      {...sectionGroupAttr("impact", "goals")}
      {...anchorProps(id, val(f, K.goalsHeading))}
      className={cn(
        "wealth-section wealth-on-paper wealth-impact-anchor",
        hasImage && "wealth-impact-bleed wealth-impact-bleed--left",
      )}
    >
      {hasImage ? (
        <ImpactBleedPhoto src={image} alt={val(f, K.goalsImageAlt)} reveal />
      ) : null}
      <div className="wealth-container">
        <div className={hasImage ? "wealth-impact-bleed__text" : undefined}>
          <ImpactSectionHead
            sectionId={id}
            number={number}
            headingSize="xl"
            eyebrow={val(f, K.goalsEyebrow)}
            eyebrowKey={K.goalsEyebrow}
            heading={val(f, K.goalsHeading)}
            headingKey={K.goalsHeading}
          />
          {intro ? (
            // Paragraph-split textarea: no fieldAttr (the editor patch
            // would flatten the paragraphs).
            <WealthReveal delay={1} className="wealth-impact-copy">
              <ImpactParagraphs text={intro} sourceCount={sourceCount} />
            </WealthReveal>
          ) : null}
          {goals.length > 0 ? (
            <WealthReveal
              delay={2}
              threshold={0}
              className={cn(
                "wealth-impact-goalbox wealth-on-forest",
                !hasImage && "wealth-impact-goalbox--wide",
              )}
              style={
                { "--wealth-impact-goal-cols": cols } as React.CSSProperties
              }
            >
              {listLabel ? (
                <p
                  {...fieldAttr(K.goalsListLabel)}
                  id={labelId}
                  className="wealth-impact-goalbox__label"
                >
                  {listLabel}
                </p>
              ) : null}
              <ol
                className="wealth-impact-goalbox__list"
                {...(listLabel ? { "aria-labelledby": labelId } : {})}
              >
                {goals.map((g, i) => (
                  <li key={g.id} {...listItemAttr(K.goalsItems, g.index)}>
                    <span
                      className="wealth-impact-goalbox__no"
                      aria-hidden="true"
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p>
                      <strong>{g.title}</strong>
                      {g.line ? ` ${g.line}` : null}
                    </p>
                  </li>
                ))}
              </ol>
            </WealthReveal>
          ) : null}
        </div>
      </div>
    </section>
  );
}
