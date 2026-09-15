import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react";

import { cn } from "~/lib/utils";

/**
 * The six grounds a section may be printed on. Each pair is measured in
 * design.md: `sage` is the committed field and takes WHITE type; every other
 * tone is a card stock or a wash and takes INK type. There is no seventh
 * option on purpose — a tone outside this list has no measured text pair.
 */
export type OliveSectionTone =
  | "white"
  | "paper"
  | "sage"
  | "slate"
  | "sage-tint"
  | "slate-tint";

const TONE_BACKGROUND: Record<OliveSectionTone, string> = {
  white: "var(--olive-white)",
  paper: "var(--olive-paper)",
  sage: "var(--olive-sage)",
  slate: "var(--olive-slate)",
  "sage-tint": "var(--olive-sage-tint)",
  "slate-tint": "var(--olive-slate-tint)",
};

/** White type is only ever legal on the sage field. See design.md § Palette. */
const TONE_FOREGROUND: Record<OliveSectionTone, string> = {
  white: "var(--olive-ink)",
  paper: "var(--olive-ink)",
  sage: "var(--olive-white)",
  slate: "var(--olive-ink)",
  "sage-tint": "var(--olive-ink)",
  "slate-tint": "var(--olive-ink)",
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
   * inner container. Without it the section IS the container, so a tone reads
   * as a capped panel rather than a band across the page.
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
 * Caps content at `--olive-container` (1280px), pads with
 * `--olive-section-pad-y` / `--olive-section-pad-x` (the same x-padding the
 * header and footer use, so every edge lines up), and paints one of the six
 * measured tone pairs.
 *
 * Extra props spread onto the root element, so
 * `{...sectionGroupAttr("homepage", "categories")}` and `aria-labelledby`
 * work without a dedicated prop.
 *
 * On `tone="sage"` the root sets `color: var(--olive-white)`, which plain
 * text and `OliveSectionHeading tone="invert"` inherit. The scoped type-scale
 * classes (`olive-h2`, `olive-caption`, …) hardcode ink, so on a sage band
 * either use `OliveSectionHeading` with `tone="invert"` or set the colour
 * yourself — the section also carries `data-olive-tone` for a future CSS hook.
 */
export function OliveSection({
  children,
  as = "section",
  bleed = false,
  tone = "white",
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
          style={{ maxWidth: "var(--olive-container)", ...innerStyle }}
        >
          {children}
        </div>
      ) : (
        children
      )}
    </Tag>
  );
}
