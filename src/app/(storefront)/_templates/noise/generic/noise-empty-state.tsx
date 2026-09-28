import type { ReactNode } from "react";

import { fieldAttr } from "~/lib/preview/section-attrs";

type Props = {
  heading: string;
  headingFieldKey?: string;
  /** One short line under the heading. Hidden when blank. */
  body?: string | null;
  bodyFieldKey?: string;
  /** Optional action under the copy (a stamp link). */
  children?: ReactNode;
};

/**
 * NoiseEmptyState — the designed "nothing here yet" panel for the pages on
 * the generic base (no events, no videos, no questions, no services).
 *
 * Built from noise's own parts: the testimonial card's hairline frame on
 * paper, the blog placeholder's hatch as a thin strip, an italic Cormorant
 * h2 and a steel-mist sans line. The heading is an h2 because it sits
 * directly under the page's h1.
 */
export function NoiseEmptyState({
  heading,
  headingFieldKey,
  body,
  bodyFieldKey,
  children,
}: Props) {
  const bodyText = body?.trim() ? body : null;

  return (
    <div className="flex flex-col items-center gap-4 border border-(--vn-rule) bg-(--vn-paper) px-6 pb-16 text-center">
      <span
        aria-hidden="true"
        className="-mx-6 mb-10 block h-2 self-stretch"
        style={{
          background:
            "repeating-linear-gradient(135deg, var(--vn-rule) 0 6px, transparent 6px 12px)",
        }}
      />
      <h2
        className="font-serif leading-[1.1] tracking-tight italic"
        style={{
          fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)",
          letterSpacing: "-0.02em",
        }}
        {...(headingFieldKey ? fieldAttr(headingFieldKey) : {})}
      >
        {heading}
      </h2>
      {bodyText ? (
        <p
          className="font-sans text-[14px] leading-relaxed text-(--vn-steel-mist)"
          style={{ maxWidth: "46ch" }}
          {...(bodyFieldKey ? fieldAttr(bodyFieldKey) : {})}
        >
          {bodyText}
        </p>
      ) : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
