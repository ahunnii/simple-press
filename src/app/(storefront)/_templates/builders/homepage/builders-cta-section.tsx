import Link from "next/link";
import { Wrench } from "lucide-react";

import { fieldAttr } from "~/lib/preview/section-attrs";

type BuildersCtaSectionProps = {
  heading: string;
  body: string;
  buttonLabel: string;
  buttonHref: string;
  sectionAttrs?: Record<string, string>;
  /**
   * Live-text field keys — optional because this component is shared
   * between the homepage ("builders.homepage.cta-*") and the generic
   * content-page CTA ("builders.global.cta-*"). Only annotate when the
   * caller passes its own field key.
   */
  headingFieldKey?: string;
  bodyFieldKey?: string;
  buttonLabelFieldKey?: string;
};

export function BuildersCtaSection({
  heading,
  body,
  buttonLabel,
  buttonHref,
  sectionAttrs,
  headingFieldKey,
  bodyFieldKey,
  buttonLabelFieldKey,
}: BuildersCtaSectionProps) {
  return (
    <section
      {...sectionAttrs}
      className="border-t border-gray-200 py-32"
      style={{ background: "var(--builders-alt, #F1F3F5)" }}
    >
      <div className="mx-auto flex max-w-[1280px] flex-col items-center px-4 text-center md:px-12">
        {/* Icon */}
        <Wrench
          className="mb-6 h-14 w-14"
          style={{ color: "var(--builders-accent, #FFC5B6)" }}
          aria-hidden="true"
        />

        <h2
          {...(headingFieldKey ? fieldAttr(headingFieldKey) : {})}
          className="mb-6 text-4xl leading-tight font-light tracking-tighter [overflow-wrap:anywhere] break-words uppercase md:text-6xl lg:text-7xl"
          style={{
            fontFamily: "var(--font-builders-display, 'Jost', sans-serif)",
            color: "var(--builders-ink, #131313)",
          }}
        >
          {heading}
        </h2>

        {body && (
          <p
            {...(bodyFieldKey ? fieldAttr(bodyFieldKey) : {})}
            className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-gray-700"
          >
            {body}
          </p>
        )}

        {buttonLabel && (
          <Link
            href={buttonHref || "/contact"}
            {...(buttonLabelFieldKey ? fieldAttr(buttonLabelFieldKey) : {})}
            className="inline-block border border-[var(--builders-accent)] bg-[var(--builders-accent)] px-12 py-5 text-xs font-bold tracking-[0.1em] text-[var(--builders-accent-ink)] uppercase transition-all duration-300 hover:border-[var(--builders-accent-hover)] hover:bg-[var(--builders-accent-hover)] hover:shadow-[0_0_15px_rgba(255,197,182,0.6)]"
            style={{
              fontFamily: "var(--font-builders-body, 'Agdasima', sans-serif)",
            }}
          >
            {buttonLabel}
          </Link>
        )}
      </div>
    </section>
  );
}
