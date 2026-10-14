import Image from "next/image";

import type { ImpactFields } from "./wealth-impact-head";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { WealthArrowLink } from "../shared/wealth-arrow-link";
import { WealthLedgeButton } from "../shared/wealth-ledge-button";
import { WealthReveal } from "../shared/wealth-reveal";
import { WEALTH_IMPACT_KEYS as K } from "./index";
import { ImpactFramedPhoto, WealthRings } from "./wealth-impact-devices";
import { val } from "./wealth-impact-head";

type Props = {
  f: ImpactFields;
  /** Business logo (the round mark is cropped out of the lockup by CSS). */
  logoUrl: string;
  /** Kept for the orchestrator's call site; the cover no longer prints it. */
  businessName?: string;
  /** Used for the H1 when the theme heading is somehow empty. */
  pageTitle: string;
  /** First rendered report section, or null when none has content yet. */
  firstSectionId: string | null;
  /**
   * Route-checked PDF link (the page passes `liveHref(hero-pdf-url)`, which
   * blanks an internal link to a switched-off feature). Omitted → the raw
   * `hero-pdf-url` field.
   */
  pdfHref?: string;
};

/**
 * 1 · Forest cover (not hideable). The only H1 on the page: the year line +
 * theme heading (`page.title` stays the browser title via the route's
 * metadata, and is the H1 fallback if the theme resolves empty).
 *
 * v2: a mono running line (logo mark · eyebrow · hairline · period), the
 * full-colour framed cover photo with the sage ledge block, and rings
 * bleeding off the bottom-right. No photo → a full-width panel, rings stay.
 */
export function WealthImpactHero({
  f,
  logoUrl,
  pageTitle,
  firstSectionId,
  pdfHref,
}: Props) {
  const eyebrow = val(f, K.heroEyebrow);
  const year = val(f, K.heroYear);
  const theme = val(f, K.heroTheme) || pageTitle;
  const deck = val(f, K.heroDeck);
  const readLabel = val(f, K.heroButtonLabel);
  const pdfUrl = pdfHref ?? val(f, K.heroPdfUrl);
  const pdfLabel = val(f, K.heroPdfLabel);
  const period = val(f, K.heroPeriod);
  const image = val(f, K.heroImage);
  const imageAlt = val(f, K.heroImageAlt);

  const showRead = Boolean(firstSectionId && readLabel);
  const showPdf = Boolean(pdfUrl && pdfLabel);
  const showRunning = Boolean(logoUrl || eyebrow || period);

  return (
    <section
      {...sectionGroupAttr("impact", "hero")}
      aria-labelledby="impact-h1"
      className={cn(
        "wealth-impact-cover wealth-on-forest wealth-impact-ringed",
        !image && "wealth-impact-cover--nophoto",
      )}
    >
      <WealthRings placement="cover" />
      <div className="wealth-container wealth-impact-cover__grid">
        <div className="wealth-impact-cover__text">
          {showRunning ? (
            <WealthReveal className="wealth-impact-running">
              {logoUrl ? (
                <span
                  className="wealth-impact-running__mark"
                  aria-hidden="true"
                >
                  <Image
                    src={logoUrl}
                    alt=""
                    width={450}
                    height={200}
                    sizes="160px"
                  />
                </span>
              ) : null}
              {eyebrow ? (
                <span
                  {...fieldAttr(K.heroEyebrow)}
                  className="wealth-impact-running__label"
                >
                  {eyebrow}
                </span>
              ) : null}
              {eyebrow && period ? (
                <span
                  className="wealth-impact-running__rule"
                  aria-hidden="true"
                />
              ) : null}
              {period ? (
                <span {...fieldAttr(K.heroPeriod)}>{period}</span>
              ) : null}
            </WealthReveal>
          ) : null}
          <WealthReveal delay={1}>
            <h1 id="impact-h1" className="wealth-impact-cover__title">
              {year ? (
                <>
                  <span
                    {...fieldAttr(K.heroYear)}
                    className="wealth-impact-cover__year"
                  >
                    {year}
                  </span>
                  <span className="sr-only">: </span>
                </>
              ) : null}
              <span
                {...fieldAttr(K.heroTheme)}
                className="wealth-impact-cover__theme"
              >
                {theme}
              </span>
            </h1>
          </WealthReveal>
          {deck ? (
            <WealthReveal delay={2}>
              <p
                {...fieldAttr(K.heroDeck)}
                className="wealth-impact-cover__deck"
              >
                {deck}
              </p>
            </WealthReveal>
          ) : null}
          {showRead || showPdf ? (
            <WealthReveal delay={3} className="wealth-impact-cover__actions">
              <div className="wealth-btn-row">
                {showRead && firstSectionId ? (
                  <WealthLedgeButton href={`#${firstSectionId}`} onDark>
                    <span {...fieldAttr(K.heroButtonLabel)}>{readLabel}</span>
                  </WealthLedgeButton>
                ) : null}
                {showPdf ? (
                  <WealthArrowLink href={pdfUrl}>
                    <span {...fieldAttr(K.heroPdfLabel)}>{pdfLabel}</span>
                  </WealthArrowLink>
                ) : null}
              </div>
            </WealthReveal>
          ) : null}
        </div>
        {image ? (
          <WealthReveal delay={2} className="wealth-impact-cover__media">
            <ImpactFramedPhoto
              src={image}
              alt={imageAlt}
              priority
              sizes="(min-width: 900px) 40vw, 100vw"
              className="wealth-impact-cover__photo"
            />
          </WealthReveal>
        ) : null}
      </div>
    </section>
  );
}
