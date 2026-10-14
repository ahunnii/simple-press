import Image from "next/image";

import type { ImpactFields } from "./wealth-impact-head";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { WealthReveal } from "../shared/wealth-reveal";
import { ImpactParagraphs } from "./impact-markup";
import { splitParagraphs } from "./impact-rows";
import { WEALTH_IMPACT_KEYS as K } from "./index";
import { ImpactPortrait, WealthRings } from "./wealth-impact-devices";
import { anchorProps, ImpactSectionHead, val } from "./wealth-impact-head";

export const IMPACT_LETTER_ID = "letter";

/** The letter renders only when its body has text. */
export function hasImpactLetter(f: ImpactFields): boolean {
  return splitParagraphs(val(f, K.letterBody)).length > 0;
}

/**
 * Letter (forest, rings off the left edge): numbered eyebrow, H2 + ↘, a
 * circle portrait top-right on desktop (above the head on phones), the first
 * paragraph as an italic lead, then body paragraphs. The sign-off sits on a
 * paper "signed card" with a sage ledge; the card renders when there is a
 * name or a signature image.
 */
export function WealthImpactLetter({
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
  const id = IMPACT_LETTER_ID;
  const image = val(f, K.letterImage);
  const imageAlt = val(f, K.letterImageAlt);
  const heading = val(f, K.letterHeading);
  const name = val(f, K.letterName);
  const role = val(f, K.letterRole);
  const signoff = val(f, K.letterSignoff);
  const signature = val(f, K.letterSignatureImage);
  const showCard = Boolean(name || signature);

  return (
    <section
      {...sectionGroupAttr("impact", "letter")}
      {...anchorProps(id, heading)}
      className="wealth-section wealth-on-forest wealth-impact-anchor wealth-impact-ringed wealth-impact-ltr"
    >
      <WealthRings placement="left" />
      <div className="wealth-container wealth-impact-ltr__grid">
        <ImpactSectionHead
          sectionId={id}
          number={number}
          eyebrow={val(f, K.letterEyebrow)}
          eyebrowKey={K.letterEyebrow}
          heading={heading}
          headingKey={K.letterHeading}
          headingSize="xl"
          className="wealth-impact-ltr__head"
        />
        {image ? (
          <WealthReveal delay={1} className="wealth-impact-ltr__portrait">
            <ImpactPortrait size="lg" src={image} alt={imageAlt} name={name} />
          </WealthReveal>
        ) : null}
        {/* Paragraph-split textarea: no fieldAttr (the editor patch would
            flatten the paragraphs); edits refresh the preview instead. */}
        <WealthReveal threshold={0} className="wealth-impact-ltr__body">
          <ImpactParagraphs
            text={val(f, K.letterBody)}
            sourceCount={sourceCount}
            leadClassName="wealth-impact-ltr__lead"
          />
          {showCard ? (
            <div className="wealth-on-paper wealth-impact-signed">
              {signoff ? (
                <p
                  {...fieldAttr(K.letterSignoff)}
                  className="wealth-impact-signed__off"
                >
                  {signoff}
                </p>
              ) : null}
              {signature ? (
                <span className="wealth-impact-signed__sig">
                  <Image src={signature} alt="" fill sizes="240px" />
                </span>
              ) : null}
              {name ? (
                <p
                  {...fieldAttr(K.letterName)}
                  className="wealth-impact-signed__name"
                >
                  {name}
                </p>
              ) : null}
              {role ? (
                <p
                  {...fieldAttr(K.letterRole)}
                  className="wealth-impact-signed__role"
                >
                  {role}
                </p>
              ) : null}
            </div>
          ) : null}
        </WealthReveal>
      </div>
    </section>
  );
}
