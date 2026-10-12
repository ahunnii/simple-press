import type { ImpactFields } from "./wealth-impact-head";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { WealthPhoto } from "../shared/wealth-photo";
import { WealthReveal } from "../shared/wealth-reveal";
import { ImpactParagraphs } from "./impact-markup";
import { splitParagraphs } from "./impact-rows";
import { WEALTH_IMPACT_KEYS as K } from "./index";
import { ImpactBleedPhoto } from "./wealth-impact-devices";
import { ImpactSectionHead, val } from "./wealth-impact-head";

export const IMPACT_ABOUT_ID = "impact-about";
const HISTORY_HEADING_ID = "impact-about-history-h";

/** Who we are renders when the mission or the history has body text. */
export function hasImpactAbout(f: ImpactFields): boolean {
  return (
    splitParagraphs(val(f, K.missionBody)).length > 0 ||
    splitParagraphs(val(f, K.historyBody)).length > 0
  );
}

/**
 * Who we are (paper). One section root holds two parts:
 * - Mission: a full-bleed forest-tinted photo with a paper card (sage ledge)
 *   holding the numbered eyebrow, the H2 + ↘ and the mission statement in
 *   italic Jost. No photo → the card sits on a surface field (the sage
 *   ledge reads there, and the field stays distinct from the sticky sage
 *   menu above).
 * - History: a split with the heading + paragraphs and a half-bleed photo
 *   on the right. No photo → a single prose column.
 *
 * Only ONE h2 labels the section (the mission heading; the history heading
 * when there is no mission). The other heading is also an h2 with its own id.
 */
export function WealthImpactAbout({
  f,
  number,
  sourceCount,
}: {
  f: ImpactFields;
  /** Render-order section number (cover = 1). */
  number: number;
  /** `parseImpactSources(...).length`; 0 when Sources is hidden. */
  sourceCount: number;
}) {
  const id = IMPACT_ABOUT_ID;
  const eyebrow = val(f, K.aboutEyebrow);
  const missionHeading = val(f, K.missionHeading);
  const missionBody = val(f, K.missionBody);
  const missionImage = val(f, K.missionImage);
  const historyHeading = val(f, K.historyHeading);
  const historyBody = val(f, K.historyBody);
  const historyImage = val(f, K.historyImage);

  const showMission = splitParagraphs(missionBody).length > 0;
  const showHistory = splitParagraphs(historyBody).length > 0;
  const plainMission = showMission && !missionImage;
  // A lone plain-surface mission is the whole section: take the surface tone
  // so the same-tone hairline joins it to a surface neighbour (People).
  const surfaceRoot = plainMission && !showHistory;

  const labelledBy =
    showMission && missionHeading
      ? `${id}-h`
      : showHistory && historyHeading
        ? HISTORY_HEADING_ID
        : undefined;

  return (
    <section
      {...sectionGroupAttr("impact", "about")}
      id={id}
      tabIndex={-1}
      aria-labelledby={labelledBy}
      className={cn(
        "wealth-impact-anchor wealth-impact-about",
        surfaceRoot ? "wealth-on-surface" : "wealth-on-paper",
      )}
    >
      {showMission ? (
        <div
          className={cn(
            "wealth-impact-mission",
            plainMission && "wealth-impact-mission--plain wealth-on-surface",
          )}
        >
          {missionImage ? (
            <WealthPhoto
              src={missionImage}
              alt={val(f, K.missionImageAlt)}
              treatment="tint"
              sizes="100vw"
              className="wealth-impact-mission__media"
            />
          ) : null}
          <div className="wealth-container wealth-impact-mission__wrap">
            <WealthReveal
              threshold={0}
              className="wealth-on-paper wealth-impact-mission__card"
            >
              <ImpactSectionHead
                noReveal
                sectionId={id}
                number={number}
                eyebrow={eyebrow}
                eyebrowKey={K.aboutEyebrow}
                heading={missionHeading}
                headingKey={K.missionHeading}
                className="wealth-impact-mission__head"
              />
              <div className="wealth-impact-mission__copy">
                <ImpactParagraphs
                  text={missionBody}
                  sourceCount={sourceCount}
                  className="wealth-impact-mission__body"
                />
              </div>
            </WealthReveal>
          </div>
        </div>
      ) : null}

      {showHistory ? (
        <div
          className={cn(
            "wealth-section wealth-impact-history",
            historyImage && "wealth-impact-bleed wealth-impact-bleed--right",
          )}
        >
          {historyImage ? (
            <ImpactBleedPhoto
              src={historyImage}
              alt={val(f, K.historyImageAlt)}
              reveal
            />
          ) : null}
          <div className="wealth-container">
            <WealthReveal
              threshold={0}
              className={cn(
                "wealth-impact-history__text",
                historyImage && "wealth-impact-bleed__text",
              )}
            >
              <ImpactSectionHead
                noReveal
                sectionId={id}
                headingId={HISTORY_HEADING_ID}
                // With no mission the history takes the numbered eyebrow.
                number={showMission ? undefined : number}
                eyebrow={showMission ? "" : eyebrow}
                eyebrowKey={K.aboutEyebrow}
                heading={historyHeading}
                headingKey={K.historyHeading}
                className="wealth-impact-history__head"
              />
              <div className="wealth-impact-copy wealth-impact-copy--lg">
                <ImpactParagraphs
                  text={historyBody}
                  sourceCount={sourceCount}
                />
              </div>
            </WealthReveal>
          </div>
        </div>
      ) : null}
    </section>
  );
}
