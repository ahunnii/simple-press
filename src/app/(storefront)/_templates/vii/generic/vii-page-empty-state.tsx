import type { ReactNode } from "react";

import { fieldAttr } from "~/lib/preview/section-attrs";

type Props = {
  heading: string;
  headingFieldKey?: string;
  /** Optional line under the heading. Hidden when blank. */
  body?: string;
  bodyFieldKey?: string;
  /** Optional action row (e.g. a link) under the text. */
  children?: ReactNode;
};

/**
 * ViiPageEmptyState — the designed "nothing here yet" panel for pages on the
 * generic base (no events, no videos, no FAQ items, no donation options).
 * A paper panel on the page edge with an italic serif line, the same voice
 * as the services index's empty state. Heading renders as an `<h2>` so the
 * page keeps a single h1 (in the band).
 */
export function ViiPageEmptyState({
  heading,
  headingFieldKey,
  body,
  bodyFieldKey,
  children,
}: Props) {
  return (
    <div
      style={{
        background: "var(--vii-paper)",
        border: "1px solid var(--vii-hairline)",
        borderRadius: "var(--radius)",
        padding: "clamp(56px, 8vw, 96px) clamp(24px, 4vw, 48px)",
        textAlign: "center",
      }}
    >
      <h2
        {...(headingFieldKey ? fieldAttr(headingFieldKey) : {})}
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontWeight: 400,
          fontSize: "clamp(24px, 3vw, 36px)",
          lineHeight: 1.2,
          color: "var(--vii-navy)",
          margin: "0 auto",
          maxWidth: 560,
        }}
      >
        {heading}
      </h2>
      {body?.trim() && (
        <p
          {...(bodyFieldKey ? fieldAttr(bodyFieldKey) : {})}
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 15,
            lineHeight: 1.7,
            color: "var(--vii-ink-soft)",
            margin: "14px auto 0",
            maxWidth: 480,
          }}
        >
          {body}
        </p>
      )}
      {children && <div style={{ marginTop: 28 }}>{children}</div>}
    </div>
  );
}
