import type { CSSProperties, ReactNode } from "react";

import type { OliveSectionTone } from "../shared";

import { OliveSection } from "../shared";

/**
 * The one content edge of every page on olive's generic base.
 *
 * A non-bleed `OliveSection` caps its whole box (padding included) at
 * `--olive-container`, so its content starts `--olive-section-pad-x` inside
 * a 1280px column: 120px from the viewport edge at 1440, 16px at 390. A
 * bleed section pads the full viewport instead, so its inner container has
 * to be narrower by the same two paddings to land on that same line —
 * otherwise a toned band's text would sit 40px left of the white sections
 * around it (baseline B1.7).
 */
export const OLIVE_PAGE_EDGE_MAX =
  "calc(var(--olive-container) - 2 * var(--olive-section-pad-x))";

type Props = {
  children: ReactNode;
  /** Section ground. Any tone runs edge to edge; content stays on the page edge. */
  tone?: OliveSectionTone;
  /**
   * Drops the top padding so the section reads as the continuation of the
   * title band above it (the generic page's body does this).
   */
  flush?: boolean;
  /** Root element. Defaults to `section`. */
  as?: "section" | "div";
  /** `data-sp-group` etc. for the visual editor. */
  sectionAttrs?: Record<string, string>;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  /** Classes for the inner (edge-aligned) container. */
  className?: string;
  /**
   * Styles for the inner container. Never narrow its `maxWidth` here: the
   * container is centred, so a narrower one moves the left edge off the
   * page line. Narrow a child instead (e.g. a `max-width: 52rem` wrapper).
   */
  innerStyle?: CSSProperties;
};

/**
 * OlivePageSection — a body section of olive's generic page base.
 *
 * Wraps `OliveSection` in bleed mode so the tone runs across the page while
 * the content sits on {@link OLIVE_PAGE_EDGE_MAX} — the same left edge as
 * `OlivePageBand`'s title, the header and the footer. Every page built on
 * the generic base (generic CMS pages, events, videos, donate, FAQ,
 * services) composes its body from these.
 */
export function OlivePageSection({
  children,
  tone = "white",
  flush = false,
  as = "section",
  sectionAttrs,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  className,
  innerStyle,
}: Props) {
  return (
    <OliveSection
      as={as}
      bleed
      tone={tone}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      {...sectionAttrs}
      style={flush ? { paddingTop: 0 } : undefined}
      innerClassName={className}
      innerStyle={{ maxWidth: OLIVE_PAGE_EDGE_MAX, ...innerStyle }}
    >
      {children}
    </OliveSection>
  );
}
