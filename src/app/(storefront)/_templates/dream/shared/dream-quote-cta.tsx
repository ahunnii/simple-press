import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { DreamButton } from "./dream-button";
import { DreamClouds } from "./dream-clouds";
import { DreamHeading } from "./dream-heading";

type DreamQuoteCtaProps = {
  heading: string;
  accent?: string;
  lede: string;
  /** Checklist chips, e.g. "date + time", "location", "theme". */
  chips?: string[];
  ctaLabel: string;
  ctaUrl: string;
  headingFieldKey?: string;
  accentFieldKey?: string;
  ledeFieldKey?: string;
  ctaLabelFieldKey?: string;
  /** Spread on the section root for the preview overlay hotspot. */
  sectionAttrs?: Record<string, string>;
  className?: string;
};

/**
 * "Estimate Quote" band used on home/about/services/testimonials/service
 * pages (design.md shared inventory). Horizon wisps anchored at the band's
 * top edge and masked to it (`.dream-quote-band` + `.dream-quote-band`'s
 * mask in globals.css) so they never spill past the static container.
 */
export function DreamQuoteCta({
  heading,
  accent,
  lede,
  chips,
  ctaLabel,
  ctaUrl,
  headingFieldKey,
  accentFieldKey,
  ledeFieldKey,
  ctaLabelFieldKey,
  sectionAttrs,
  className,
}: DreamQuoteCtaProps) {
  return (
    <section {...sectionAttrs} className={cn("dream-quote-band", className)}>
      <DreamClouds variant="horizon" className="dream-quote-band-clouds" />
      <div className="dream-quote-band-content">
        <DreamHeading
          as="h2"
          accent={accent}
          fieldKey={headingFieldKey}
          accentFieldKey={accentFieldKey}
        >
          {heading}
        </DreamHeading>
        <p
          className="dream-quote-band-lede"
          {...(ledeFieldKey ? fieldAttr(ledeFieldKey) : {})}
        >
          {lede}
        </p>
        {chips && chips.length > 0 ? (
          <ul className="dream-quote-band-chips">
            {chips.map((chip) => (
              <li key={chip} className="dream-quote-band-chip">
                {chip}
              </li>
            ))}
          </ul>
        ) : null}
        <DreamButton href={ctaUrl} variant="primary">
          <span {...(ctaLabelFieldKey ? fieldAttr(ctaLabelFieldKey) : {})}>
            {ctaLabel}
          </span>
        </DreamButton>
      </div>
    </section>
  );
}
