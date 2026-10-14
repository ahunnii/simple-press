import type { ImpactFields } from "./wealth-impact-head";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { parseTemplateIframeValue } from "~/lib/template-fields";
import { EmbedFrame } from "~/components/embed-frame";

import { WealthLedgeButton } from "../shared/wealth-ledge-button";
import { WealthReveal } from "../shared/wealth-reveal";
import { WEALTH_IMPACT_KEYS as K } from "./index";
import { anchorProps, ImpactSectionHead, val } from "./wealth-impact-head";

export const IMPACT_REPORT_ID = "impact-report";

/** The section renders only when `report-embed-url` holds a valid embed. */
export function hasImpactReportEmbed(f: ImpactFields): boolean {
  return parseTemplateIframeValue(val(f, K.reportEmbedUrl)) !== null;
}

/**
 * 15 · Full report: surface. Centered head, then the owner's embed (Canva /
 * Issuu / Drive) in a portrait frame, at most 880px wide and never taller
 * than the viewport minus the header and menu, on a sage ledge. The cover's
 * PDF (`hero-pdf-url` + `hero-pdf-label`) follows as a ledge button when
 * both are set.
 *
 * The frame's shape is fixed by CSS: the owner's pixel height / aspect /
 * max-width presets are deliberately ignored so the viewer stays portrait.
 */
export function WealthImpactReport({
  f,
  number,
  pdfHref,
}: {
  f: ImpactFields;
  /** Render-order section number (cover = 1). */
  number?: number;
  /**
   * Route-checked PDF link (the page passes `liveHref(hero-pdf-url)`).
   * Omitted → the raw `hero-pdf-url` field.
   */
  pdfHref?: string;
}) {
  const id = IMPACT_REPORT_ID;
  const embed = parseTemplateIframeValue(val(f, K.reportEmbedUrl));
  if (!embed) return null;
  const pdfUrl = pdfHref ?? val(f, K.heroPdfUrl);
  const pdfLabel = val(f, K.heroPdfLabel);
  return (
    <section
      {...sectionGroupAttr("impact", "report")}
      {...anchorProps(id, val(f, K.reportHeading))}
      className="wealth-section wealth-on-surface wealth-impact-anchor"
    >
      <div className="wealth-container">
        <ImpactSectionHead
          sectionId={id}
          number={number}
          center
          headingSize="xl"
          eyebrow={val(f, K.reportEyebrow)}
          eyebrowKey={K.reportEyebrow}
          heading={val(f, K.reportHeading)}
          headingKey={K.reportHeading}
        />
        <WealthReveal delay={1} threshold={0} className="wealth-impact-embed">
          <div className="wealth-impact-embed__frame">
            <EmbedFrame
              src={embed.src}
              title={embed.title || val(f, K.reportHeading) || "Impact report"}
            />
          </div>
          {pdfUrl && pdfLabel ? (
            <div className="wealth-impact-embed__cta">
              <WealthLedgeButton href={pdfUrl}>
                <span {...fieldAttr(K.heroPdfLabel)}>{pdfLabel}</span>
              </WealthLedgeButton>
            </div>
          ) : null}
        </WealthReveal>
      </div>
    </section>
  );
}
