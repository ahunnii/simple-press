import type { ReactNode } from "react";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { FadeIn } from "~/components/page-animations";

type Props = {
  /** Small tracked label above the heading. Hidden when blank. */
  overline?: string | null;
  overlineFieldKey?: string;
  /** Hidden when blank (the band then leads with its line or actions). */
  heading: string;
  headingFieldKey?: string;
  /** One short line under the heading. Hidden when blank. */
  body?: string | null;
  bodyFieldKey?: string;
  /**
   * The band's actions (buttons, a booking embed). Rendered OUTSIDE the
   * fade: an embedded booking form must never start at opacity 0.
   */
  children?: ReactNode;
  /** `data-sp-group` etc. for the visual editor. */
  sectionAttrs?: Record<string, string>;
};

/**
 * NoiseClosingBand — the ink band that ends a page on the generic base,
 * transcribed from the testimonials page's closing section: 2px rules, mono
 * overline, italic Cormorant h2, a sans line, bone-filled button. Centred —
 * heading, line and button move together on the page's centre line.
 */
export function NoiseClosingBand({
  overline,
  overlineFieldKey,
  heading,
  headingFieldKey,
  body,
  bodyFieldKey,
  children,
  sectionAttrs,
}: Props) {
  const overlineText = overline?.trim() ? overline : null;
  const headingText = heading.trim() ? heading : null;
  const bodyText = body?.trim() ? body : null;

  return (
    <section
      aria-label={headingText ?? undefined}
      className="border-y-2 border-(--vn-ink) px-6 py-20 text-center sm:px-7"
      style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
      {...sectionAttrs}
    >
      <FadeIn className="mx-auto" style={{ maxWidth: "780px" }}>
        {overlineText ? (
          <p
            className="mb-5 font-mono text-[9.5px] tracking-[0.28em] uppercase"
            style={{ opacity: 0.72 }}
            {...(overlineFieldKey ? fieldAttr(overlineFieldKey) : {})}
          >
            {overlineText}
          </p>
        ) : null}
        {headingText ? (
          <h2
            className="font-serif leading-none tracking-tight italic"
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              letterSpacing: "-0.02em",
            }}
            {...(headingFieldKey ? fieldAttr(headingFieldKey) : {})}
          >
            {headingText}
          </h2>
        ) : null}
        {bodyText ? (
          <p
            className="mx-auto mt-5 font-sans text-[14px] leading-[1.85]"
            style={{ opacity: 0.78, maxWidth: "48ch" }}
            {...(bodyFieldKey ? fieldAttr(bodyFieldKey) : {})}
          >
            {bodyText}
          </p>
        ) : null}
      </FadeIn>

      {children ? (
        <div className="mx-auto mt-8 flex w-full max-w-[1320px] flex-col items-center gap-6">
          {children}
        </div>
      ) : null}
    </section>
  );
}
