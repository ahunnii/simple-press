import type { CSSProperties, ReactNode } from "react";

import { VII_EDGE_CONTAINER, VII_PAGE_GUTTER } from "../shared/vii-page-edge";

const TONE_BG = {
  cream: "var(--vii-cream)",
  paper: "var(--vii-paper)",
  navy: "var(--vii-navy)",
} as const;

type Props = {
  children: ReactNode;
  /** Section surface. Defaults to the page's cream. */
  tone?: keyof typeof TONE_BG;
  /** Vertical padding (top and bottom). Defaults to 56–96px. */
  paddingY?: string;
  /** Overrides the bottom padding only (e.g. 0 when the next band continues it). */
  paddingBottom?: string;
  /** `data-sp-group` etc. for the visual editor. */
  sectionAttrs?: Record<string, string>;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  /** Extra styles on the inner container (e.g. a narrower `maxWidth`). */
  innerStyle?: CSSProperties;
};

/**
 * ViiPageSection — a body section of vii's generic page base. Full-bleed
 * surface, content on the `--vii-section-pad-x` gutter in a left-anchored
 * container ({@link VII_EDGE_CONTAINER}), so everything below a
 * `ViiPageBand` or `ViiHero` shares the hero's left edge (86px at 1440, 24px
 * at 390 — baseline B1.7).
 */
export function ViiPageSection({
  children,
  tone = "cream",
  paddingY = "clamp(56px, 8vw, 96px)",
  paddingBottom,
  sectionAttrs,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  innerStyle,
}: Props) {
  return (
    <section
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      {...sectionAttrs}
      style={{
        background: TONE_BG[tone],
        paddingTop: paddingY,
        paddingBottom: paddingBottom ?? paddingY,
        paddingLeft: VII_PAGE_GUTTER,
        paddingRight: VII_PAGE_GUTTER,
      }}
    >
      <div style={{ ...VII_EDGE_CONTAINER, ...innerStyle }}>{children}</div>
    </section>
  );
}
