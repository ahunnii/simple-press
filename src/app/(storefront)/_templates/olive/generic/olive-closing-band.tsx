import type { ReactNode } from "react";

import { fieldAttr } from "~/lib/preview/section-attrs";

import { OliveLeafMark, OliveReveal } from "../shared";
import { OlivePageSection } from "./olive-page-section";

type Props = {
  /** Hidden when blank (the band then leads with its line or actions). */
  heading: string;
  headingFieldKey?: string;
  /** One short line under the heading. Hidden when blank. */
  body?: string | null;
  bodyFieldKey?: string;
  /**
   * The band's actions (buttons, a booking embed). Rendered OUTSIDE the
   * reveal: an embedded booking form must never start at opacity 0.
   */
  children?: ReactNode;
  /** `data-sp-group` etc. for the visual editor. */
  sectionAttrs?: Record<string, string>;
};

/**
 * OliveClosingBand — the paper band that ends a page on the generic base
 * ("Want us at your event?", "Not sure what to book?").
 *
 * Deliberately centred — heading, line and button move together on the
 * page's centre line (B1.7 allows a centred heading + text block), the same
 * composition as the testimonials page's review invite. Paper, not sage, so
 * it never merges into the sage footer directly below it.
 */
export function OliveClosingBand({
  heading,
  headingFieldKey,
  body,
  bodyFieldKey,
  children,
  sectionAttrs,
}: Props) {
  const bodyText = body?.trim() ? body : null;

  return (
    <OlivePageSection
      tone="paper"
      aria-label={heading || undefined}
      sectionAttrs={sectionAttrs}
      className="flex flex-col items-center text-center"
    >
      <OliveReveal className="flex max-w-[40rem] flex-col items-center gap-4">
        <span aria-hidden="true" style={{ color: "var(--olive-leaf)" }}>
          <OliveLeafMark size={22} />
        </span>
        {heading.trim() ? (
          <h2
            className="olive-h2"
            {...(headingFieldKey ? fieldAttr(headingFieldKey) : {})}
          >
            {heading}
          </h2>
        ) : null}
        {bodyText ? (
          <p
            className="max-w-[52ch] text-[0.9375rem] leading-relaxed"
            style={{ color: "var(--olive-ink-soft)" }}
            {...(bodyFieldKey ? fieldAttr(bodyFieldKey) : {})}
          >
            {bodyText}
          </p>
        ) : null}
      </OliveReveal>

      {children ? (
        <div className="mt-6 flex w-full flex-col items-center gap-6">
          {children}
        </div>
      ) : null}
    </OlivePageSection>
  );
}
