import type { CSSProperties } from "react";

import { ViiOverline } from "./vii-overline";

type Props = {
  overline?: string;
  heading: string;
  /** Applied as `id` on the `<h2>` — use with `aria-labelledby` on the parent section. */
  headingId?: string;
  /** Passed to `ViiOverline`. "light" suits cream/paper backgrounds; "dark" suits navy. Default "light". */
  tone?: "light" | "dark";
  /** Render the 1 px hairline rule below the heading. Default true. */
  rule?: boolean;
  /** Extra styles merged onto the root wrapper `<div>`. */
  style?: CSSProperties;
};

/**
 * ViiSectionHeading — the shared header block used in vii section components.
 *
 * Renders (in order): an optional `ViiOverline` kicker, an `<h2>` in the
 * brand serif, and an optional 1 px hairline rule — matching the exact styles
 * from `vii-product-rail.tsx` lines 55-94.
 *
 * The outer reveal-item wrapper and `marginBottom` are intentionally left to
 * the caller so each section can control its own stagger index and spacing.
 */
export function ViiSectionHeading({
  overline,
  heading,
  headingId,
  tone = "light",
  rule = true,
  style,
}: Props) {
  return (
    <div style={style}>
      {overline && (
        <ViiOverline tone={tone} style={{ marginBottom: 6 }}>
          {overline}
        </ViiOverline>
      )}
      <h2
        id={headingId}
        style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 400,
          fontSize: "clamp(26px, 3.6vw, 44px)",
          lineHeight: 1.1,
          color: "var(--vii-navy)",
          margin: 0,
        }}
      >
        {heading}
      </h2>
      {rule && (
        <div
          aria-hidden="true"
          style={{
            height: 1,
            background: "color-mix(in srgb, var(--vii-navy) 20%, transparent)",
            marginTop: "clamp(16px, 2vw, 22px)",
          }}
        />
      )}
    </div>
  );
}
