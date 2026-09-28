import type { ReactNode } from "react";

import { fieldAttr } from "~/lib/preview/section-attrs";

import { VII_PAGE_GUTTER } from "../shared/vii-page-edge";

type Props = {
  heading: string;
  headingFieldKey?: string;
  body?: string;
  bodyFieldKey?: string;
  /** The band's action(s), e.g. a vii button. */
  children?: ReactNode;
  sectionAttrs?: Record<string, string>;
};

/**
 * ViiClosingBand — the navy closing banner that ends a page on the generic
 * base (e.g. the events page's "Want us at your event?"). A deliberately
 * centered editorial band — like vii's centered intro bands, it sits on the
 * page's center line rather than the left page edge (B1.7 allows centered
 * heading + text together).
 */
export function ViiClosingBand({
  heading,
  headingFieldKey,
  body,
  bodyFieldKey,
  children,
  sectionAttrs,
}: Props) {
  return (
    <section
      aria-label={heading || undefined}
      {...sectionAttrs}
      style={{
        background: "var(--vii-navy)",
        padding: `var(--vii-section-pad-y) ${VII_PAGE_GUTTER}`,
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <span
          aria-hidden="true"
          style={{
            display: "block",
            width: 32,
            height: 1,
            margin: "0 auto 28px",
            background: "var(--vii-copper-light)",
          }}
        />
        <h2
          {...(headingFieldKey ? fieldAttr(headingFieldKey) : {})}
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            fontSize: "clamp(28px, 3.6vw, 44px)",
            lineHeight: 1.12,
            color: "var(--vii-paper)",
            margin: 0,
          }}
        >
          {heading}
        </h2>
        {body?.trim() && (
          <p
            {...(bodyFieldKey ? fieldAttr(bodyFieldKey) : {})}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 16,
              lineHeight: 1.7,
              color:
                "color-mix(in srgb, var(--vii-paper) 82%, var(--vii-navy))",
              margin: "18px auto 0",
              maxWidth: 520,
            }}
          >
            {body}
          </p>
        )}
        {children && <div style={{ marginTop: 36 }}>{children}</div>}
      </div>
    </section>
  );
}
