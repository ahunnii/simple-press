import type { ReactNode } from "react";

import { fieldAttr } from "~/lib/preview/section-attrs";

import { ViiOverline } from "../shared/vii-overline";
import { VII_BAND_PADDING_TOP, VII_PAGE_GUTTER } from "../shared/vii-page-edge";

type Props = {
  /** The page's only h1. */
  title: string;
  /** Full template field key for `title`, when it is exactly one field's value. */
  titleFieldKey?: string;
  /** Tracked kicker above the title (copper lead-rule). Hidden when blank. */
  overline?: ReactNode;
  overlineFieldKey?: string;
  /** Short paragraph under the title. Hidden when blank. */
  intro?: string;
  introFieldKey?: string;
  /** Row above the overline, e.g. a back link. */
  leading?: ReactNode;
  /** Rows under the intro, e.g. event meta. */
  children?: ReactNode;
  /** `data-sp-group` etc. for the visual editor. */
  sectionAttrs?: Record<string, string>;
  /** Accessible name for the band's `<section>`. Defaults to the title. */
  ariaLabel?: string;
};

/**
 * ViiPageBand — the cream editorial title band of vii's generic page (the
 * no-cover-image hero of `ViiGenericPage`), shared by every page built on
 * the generic base (events, event, videos, donate, FAQ).
 *
 * - Clears the fixed header: the top padding is `--vii-header-offset` plus
 *   48–72px, so the overline and h1 always start below the ≈89px header
 *   (plus announcement bar) at 1440 and 390.
 * - Sits on vii's one page edge: the `--vii-section-pad-x` gutter, the same
 *   left edge as `ViiHero`'s text (86px at 1440). Left-anchored, never
 *   re-centered, so the sections below it (`ViiPageSection`) line up.
 *
 * Server-safe (no hooks): the band renders static, like the generic page's.
 */
export function ViiPageBand({
  title,
  titleFieldKey,
  overline,
  overlineFieldKey,
  intro,
  introFieldKey,
  leading,
  children,
  sectionAttrs,
  ariaLabel,
}: Props) {
  const hasOverline =
    typeof overline === "string" ? overline.trim().length > 0 : !!overline;
  const hasIntro = !!intro?.trim();

  return (
    <section
      aria-label={ariaLabel ?? (title || undefined)}
      {...sectionAttrs}
      style={{
        background: "var(--vii-cream)",
        borderBottom: "1px solid var(--vii-hairline)",
        // Longhands: each side is its own token expression.
        paddingTop: VII_BAND_PADDING_TOP,
        paddingRight: VII_PAGE_GUTTER,
        paddingBottom: "clamp(48px, 6vw, 64px)",
        paddingLeft: VII_PAGE_GUTTER,
      }}
    >
      {leading && <div style={{ marginBottom: 28 }}>{leading}</div>}

      {hasOverline && (
        <ViiOverline
          align="left"
          tone="light"
          fieldKey={overlineFieldKey}
          style={{ marginBottom: 20 }}
        >
          {overline}
        </ViiOverline>
      )}

      <h1
        {...(titleFieldKey ? fieldAttr(titleFieldKey) : {})}
        style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 600,
          fontSize: "clamp(2rem, 4vw, 3.5rem)",
          lineHeight: 1.1,
          letterSpacing: "-0.025em",
          color: "var(--vii-navy)",
          margin: 0,
          overflowWrap: "anywhere",
        }}
      >
        {title}
      </h1>

      {hasIntro && (
        <p
          {...(introFieldKey ? fieldAttr(introFieldKey) : {})}
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 17,
            lineHeight: 1.6,
            color: "var(--vii-ink-soft)",
            maxWidth: 560,
            margin: "20px 0 0",
            whiteSpace: "pre-line",
          }}
        >
          {intro}
        </p>
      )}

      {children}
    </section>
  );
}
