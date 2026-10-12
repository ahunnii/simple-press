import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { WealthReveal } from "../shared/wealth-reveal";
import { ImpactHeadingMark } from "./wealth-impact-devices";

/** Resolved scalar fields (`resolveFields` output). */
export type ImpactFields = Record<string, string>;

/** Read a resolved field (`noUncheckedIndexedAccess`-safe). */
export function val(f: ImpactFields, key: string): string {
  return f[key] ?? "";
}

/**
 * Anchor-section attributes shared by every report section in the sub-nav.
 * `heading` is the section's resolved heading text: a blank heading renders
 * no `h2`, so the section must not point `aria-labelledby` at a missing id.
 */
export function anchorProps(id: string, heading: string) {
  return {
    id,
    tabIndex: -1,
    ...(heading !== "" ? { "aria-labelledby": `${id}-h` } : {}),
  } as const;
}

type Props = {
  eyebrow: string;
  eyebrowKey: string;
  heading: string;
  headingKey: string;
  /** `id` of the section; the heading gets `${sectionId}-h` (see `headingId`). */
  sectionId: string;
  /**
   * v2: render-order section number (cover = 1, so the letter is 2). Shown
   * as a mono "02 · " before the eyebrow (decorative, aria-hidden). Only
   * renders while the eyebrow has text.
   */
  number?: number;
  /** v2: the ↘ heading mark under the heading. Default true. */
  mark?: boolean;
  /** v2: heading level; `3` for a sub-head inside a section (history). */
  level?: 2 | 3;
  /** v2: override the heading id (default `${sectionId}-h`). */
  headingId?: string;
  /**
   * v2: PT Sans italic size step: `"xl"` for forest/sage feature blocks
   * (letter, support), `"stub"` for compact sections (sources). Ignored
   * when `display` is set.
   */
  headingSize?: "default" | "xl" | "stub";
  /** Large italic Jost heading (forest blocks) instead of the PT Sans H2. */
  display?: boolean;
  /** Centered head (programs). */
  center?: boolean;
  /** Right-hand link (split head). */
  aside?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  /** v2: skip the `WealthReveal` wrapper (head inside an already-revealed card). */
  noReveal?: boolean;
};

/** "3" → "03" (section numbers are always at least two digits). */
export function formatSectionNumber(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Section head used by every Impact Report section: numbered block eyebrow
 * + H2 (`.wealth-h2`, or `.wealth-display--lg` with `display`) + ↘ mark,
 * optional aside link (`--split`) or centered layout, plus extra content
 * (intro paragraph). v1 call sites keep working unchanged (they just gain
 * the mark; pass `mark={false}` to opt out).
 */
export function ImpactSectionHead({
  eyebrow,
  eyebrowKey,
  heading,
  headingKey,
  sectionId,
  number,
  mark = true,
  level = 2,
  headingId,
  headingSize = "default",
  display = false,
  center = false,
  aside,
  children,
  className,
  noReveal = false,
}: Props) {
  const Heading = level === 3 ? "h3" : "h2";
  const titleBlock = (
    <>
      {eyebrow ? (
        <p className="wealth-eyebrow wealth-eyebrow--block">
          {number !== undefined ? (
            <span className="wealth-impact-no" aria-hidden="true">
              {formatSectionNumber(number)}
              {" · "}
            </span>
          ) : null}
          <span {...fieldAttr(eyebrowKey)}>{eyebrow}</span>
        </p>
      ) : null}
      {heading ? (
        <Heading
          {...fieldAttr(headingKey)}
          id={headingId ?? `${sectionId}-h`}
          className={
            display
              ? "wealth-display wealth-display--lg"
              : cn(
                  "wealth-h2 wealth-impact-h2",
                  headingSize !== "default" &&
                    `wealth-impact-h2--${headingSize}`,
                )
          }
        >
          {heading}
        </Heading>
      ) : null}
      {heading && mark ? <ImpactHeadingMark /> : null}
    </>
  );

  const content = aside ? (
    <>
      <div>{titleBlock}</div>
      {aside}
    </>
  ) : (
    titleBlock
  );
  const cls = cn(
    "wealth-section-head wealth-impact-head",
    center && "wealth-section-head--center wealth-impact-head--center",
    !center && aside && "wealth-section-head--split",
    className,
  );

  return noReveal ? (
    <div className={cls}>
      {content}
      {children}
    </div>
  ) : (
    <WealthReveal className={cls}>
      {content}
      {children}
    </WealthReveal>
  );
}
