import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react";

import { cn } from "~/lib/utils";

/**
 * The five grounds a section may be printed on (design.md § Tokens):
 * `ivory` (page ground), `sand` (alternate band), `stone` (decorative field —
 * espresso type only), and the two dark fields `espresso` and `moss`, which
 * take ivory type. Measured pairs: espresso on ivory 15.58:1, on sand
 * 14.16:1, on stone 9.04:1; ivory on espresso 15.58:1, on moss 6.09:1.
 */
export type OliveSectionToneName =
  | "ivory"
  | "sand"
  | "espresso"
  | "moss"
  | "stone";

/**
 * Pre-2026-10-21 tone names, still accepted so older call sites compile.
 * Each maps onto one of the five grounds above (see `normalizeOliveTone`).
 */
export type OliveLegacySectionTone =
  | "white"
  | "paper"
  | "sage"
  | "slate"
  | "sage-tint"
  | "slate-tint";

export type OliveSectionTone = OliveSectionToneName | OliveLegacySectionTone;

const LEGACY_TONE: Record<OliveLegacySectionTone, OliveSectionToneName> = {
  white: "ivory",
  paper: "sand",
  sage: "moss",
  slate: "stone",
  "sage-tint": "sand",
  "slate-tint": "sand",
};

/** Map any accepted tone (new or legacy) onto one of the five grounds. */
export function normalizeOliveTone(
  tone: OliveSectionTone,
): OliveSectionToneName {
  return tone in LEGACY_TONE
    ? LEGACY_TONE[tone as OliveLegacySectionTone]
    : (tone as OliveSectionToneName);
}

/** True for the two dark fields, which take ivory type. */
export function isOliveDarkTone(tone: OliveSectionTone): boolean {
  const name = normalizeOliveTone(tone);
  return name === "espresso" || name === "moss";
}

const TONE_BACKGROUND: Record<OliveSectionToneName, string> = {
  ivory: "var(--olive-ivory)",
  sand: "var(--olive-sand)",
  espresso: "var(--olive-espresso)",
  moss: "var(--olive-moss)",
  stone: "var(--olive-stone)",
};

const TONE_FOREGROUND: Record<OliveSectionToneName, string> = {
  ivory: "var(--olive-espresso)",
  sand: "var(--olive-espresso)",
  espresso: "var(--olive-on-dark)",
  moss: "var(--olive-on-dark)",
  stone: "var(--olive-espresso)",
};

type OliveSectionProps = Omit<
  ComponentPropsWithoutRef<"section">,
  "children"
> & {
  children: ReactNode;
  /** Element to render. Defaults to `section`. */
  as?: "section" | "div" | "aside" | "article";
  /**
   * Full-width band: the tone runs edge to edge and the content sits in an
   * inner container capped at `--olive-content-max` (the container minus its
   * two paddings), so band content starts on the same edge as the header
   * wordmark and every non-bleed section. Without it the section IS the
   * container, so a tone reads as a capped panel rather than a band.
   */
  bleed?: boolean;
  tone?: OliveSectionTone;
  /** Classes for the inner container (only rendered when `bleed`). */
  innerClassName?: string;
  /** Styles for the inner container (only rendered when `bleed`). */
  innerStyle?: CSSProperties;
};

/**
 * OliveSection — the template's one layout rhythm.
 *
 * Caps content at `--olive-container`, pads with
 * `--olive-section-pad-y` / `--olive-section-pad-x` (the same x-padding the
 * header and footer use, so every edge lines up), and paints one of the five
 * measured tone pairs. Legacy tone names are normalised first, and
 * `data-olive-tone` always carries the NEW name.
 *
 * Extra props spread onto the root element, so
 * `{...sectionGroupAttr("homepage", "categories")}` and `aria-labelledby`
 * work without a dedicated prop.
 *
 * On the dark tones (`espresso`, `moss`) the root sets ivory type, and the
 * `[data-olive-tone="espresso"|"moss"]` rules in globals.css flip the scoped
 * type classes (`olive-h2`, `olive-label`, `olive-eyebrow`, …), the link /
 * outline buttons and the focus ring to their on-dark values.
 */
export function OliveSection({
  children,
  as = "section",
  bleed = false,
  tone: toneProp = "ivory",
  className,
  innerClassName,
  innerStyle,
  style,
  ...rest
}: OliveSectionProps) {
  // One intrinsic type for the spread below. `as` is always one of the four
  // block tags, all of which take the same attribute set at runtime; the cast
  // just stops TypeScript widening the JSX element to a union.
  const Tag = as as "section";
  const tone = normalizeOliveTone(toneProp);

  const rootStyle: CSSProperties = {
    backgroundColor: TONE_BACKGROUND[tone],
    color: TONE_FOREGROUND[tone],
    paddingBlock: "var(--olive-section-pad-y)",
    paddingInline: "var(--olive-section-pad-x)",
    ...(bleed ? {} : { maxWidth: "var(--olive-container)" }),
    ...style,
  };

  return (
    <Tag
      data-olive-tone={tone}
      className={cn("w-full", !bleed && "mx-auto", className)}
      style={rootStyle}
      {...rest}
    >
      {bleed ? (
        <div
          className={cn("mx-auto w-full", innerClassName)}
          style={{ maxWidth: "var(--olive-content-max)", ...innerStyle }}
        >
          {children}
        </div>
      ) : (
        children
      )}
    </Tag>
  );
}
