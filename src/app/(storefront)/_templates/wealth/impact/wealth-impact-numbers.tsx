import Image from "next/image";

import type { ImpactStat } from "./impact-rows";
import type { ImpactFields } from "./wealth-impact-head";
import {
  fieldAttr,
  listItemAttr,
  sectionGroupAttr,
} from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { WealthArrowLink } from "../shared/wealth-arrow-link";
import { WealthReveal } from "../shared/wealth-reveal";
import { WealthStats } from "../shared/wealth-stats";
import { ImpactParagraphs } from "./impact-markup";
import { statsUseLedger } from "./impact-rows";
import { WEALTH_IMPACT_KEYS as K } from "./index";
import { ImpactNumeralTile, WealthRings } from "./wealth-impact-devices";
import { anchorProps, ImpactSectionHead, val } from "./wealth-impact-head";

export const IMPACT_NUMBERS_ID = "numbers";

type Props = {
  f: ImpactFields;
  stats: ImpactStat[];
  /** Anchor of the Financials section when it rendered (enables the link). */
  financialsId: string | null;
  /** v2: render-order section number (eyebrow "06 · By the numbers"). */
  number?: number;
  /** v2: rendered source count, for `[N]` footnotes in figure details. */
  sourceCount?: number;
};

/** One ledger row: italic title + detail left, mono caption + tile right. */
function LedgerRow({
  s,
  i,
  sourceCount,
}: {
  s: ImpactStat;
  i: number;
  sourceCount: number;
}) {
  return (
    <WealthReveal
      as="li"
      delay={Math.min(i, 1)}
      {...listItemAttr(K.numbersItems, s.index)}
      className="wealth-impact-ledger__row"
    >
      <div className="wealth-impact-ledger__text">
        {s.title ? (
          <h3 className="wealth-impact-ledger__title">{s.title}</h3>
        ) : null}
        {s.detail ? (
          <div className="wealth-impact-ledger__detail">
            <ImpactParagraphs text={s.detail} sourceCount={sourceCount} />
          </div>
        ) : null}
      </div>
      <div className="wealth-impact-ledger__fig">
        {s.caption ? (
          <span className="wealth-impact-ledger__cap">{s.caption}</span>
        ) : null}
        <ImpactNumeralTile value={s.value} />
      </div>
    </WealthReveal>
  );
}

/**
 * By the numbers (design.md v2 §8): forest block, rings off the top-right,
 * numbered head (h2 + ↘) with the optional italic `numbers-intro` lead and
 * the Financials link aside.
 * - Any figure has a detail (`statsUseLedger`) → ledger rows: title (italic,
 *   sage underline) + detail paragraphs (`[N]` footnotes) on the left; mono
 *   caption + sage numeral tile on the right. No background photo.
 * - Otherwise → today's 4-up `WealthStats` grid over the optional faint
 *   background photo.
 * The note renders under either layout.
 */
export function WealthImpactNumbers({
  f,
  stats,
  financialsId,
  number,
  sourceCount = 0,
}: Props) {
  const id = IMPACT_NUMBERS_ID;
  const ledger = statsUseLedger(stats);
  const bg = ledger ? "" : val(f, K.numbersBgImage);
  const note = val(f, K.numbersNote);
  const intro = val(f, K.numbersIntro);
  const linkLabel = val(f, K.numbersLinkLabel);

  return (
    <section
      {...sectionGroupAttr("impact", "numbers")}
      {...anchorProps(id, val(f, K.numbersHeading))}
      className={cn(
        "wealth-section wealth-on-forest wealth-impact-numbers wealth-impact-anchor wealth-impact-ringed",
        ledger && "wealth-impact-numbers--ledger",
      )}
    >
      {bg ? (
        <div className="wealth-cta-band__bg" aria-hidden="true">
          <Image src={bg} alt="" fill sizes="100vw" />
        </div>
      ) : null}
      {/* After the faint photo so the strokes paint above it (both z -1). */}
      <WealthRings placement="tr" />
      <div className="wealth-container">
        <ImpactSectionHead
          sectionId={id}
          number={number}
          headingSize="xl"
          eyebrow={val(f, K.numbersEyebrow)}
          eyebrowKey={K.numbersEyebrow}
          heading={val(f, K.numbersHeading)}
          headingKey={K.numbersHeading}
          aside={
            financialsId && linkLabel ? (
              <WealthArrowLink
                href={`#${financialsId}`}
                {...fieldAttr(K.numbersLinkLabel)}
              >
                {linkLabel}
              </WealthArrowLink>
            ) : null
          }
        >
          {intro ? (
            <p {...fieldAttr(K.numbersIntro)} className="wealth-impact-intro">
              {intro}
            </p>
          ) : null}
        </ImpactSectionHead>
        {ledger ? (
          <ul className="wealth-impact-ledger">
            {stats.map((s, i) => (
              <LedgerRow key={s.id} s={s} i={i} sourceCount={sourceCount} />
            ))}
          </ul>
        ) : (
          <WealthReveal threshold={0} delay={1}>
            <WealthStats
              variant="grid"
              cols={4}
              items={stats.map((s) => ({
                key: s.id,
                value: s.value,
                caption: s.caption || undefined,
                attrs: listItemAttr(K.numbersItems, s.index),
              }))}
            />
          </WealthReveal>
        )}
        {note ? (
          <p
            {...fieldAttr(K.numbersNote)}
            className="wealth-impact-numbers__note"
          >
            {note}
          </p>
        ) : null}
      </div>
    </section>
  );
}
