import type { CSSProperties } from "react";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { OliveButton } from "./olive-button";

type OliveSectionHeadingProps = {
  heading: string;
  /** `h2` (default) or `h1` for the one page title. Picks the matching type class. */
  as?: "h1" | "h2";
  /** Applied as `id` on the heading — pair with `aria-labelledby` on the section. */
  id?: string;
  /** One line of body copy. That plus an optional link is the whole heading block. */
  body?: string;
  /** Text link rendered as the ghost variant. */
  link?: { label: string; href: string };
  align?: "start" | "center";
  /**
   * `invert` switches the block to white type for the sage field. The scoped
   * `olive-h2` / `olive-caption` classes hardcode ink, so this sets the colour
   * inline where it has to win.
   */
  tone?: "ink" | "invert" | "slate";
  /** Full template field keys, when these strings are live-patchable fields. */
  headingFieldKey?: string;
  bodyFieldKey?: string;
  linkFieldKey?: string;
  className?: string;
  style?: CSSProperties;
};

/**
 * OliveSectionHeading — the whole heading block, and deliberately no more.
 *
 * A heading, optionally one line of body copy, optionally one text link.
 * There is no overline, kicker or section-number prop and there never will
 * be: the heading carries its own weight (craft floor; design.md decisions
 * log, 2026-09-12). `olive-label` exists for column and list headings, not
 * for labelling another heading.
 */
export function OliveSectionHeading({
  heading,
  as = "h2",
  id,
  body,
  link,
  align = "start",
  tone = "ink",
  headingFieldKey,
  bodyFieldKey,
  linkFieldKey,
  className,
  style,
}: OliveSectionHeadingProps) {
  const Heading = as;
  const invert = tone === "invert";

  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center" && "items-center text-center",
        className,
      )}
      style={style}
    >
      <Heading
        id={id}
        className={as === "h1" ? "olive-h1" : "olive-h2"}
        style={invert ? { color: "var(--olive-white)" } : undefined}
        {...(headingFieldKey ? fieldAttr(headingFieldKey) : {})}
      >
        {heading}
      </Heading>

      {body ? (
        <p
          className="max-w-[62ch] text-[0.9375rem] leading-relaxed"
          style={{
            color: invert
              ? "var(--olive-white)"
              : tone === "slate"
                ? "var(--olive-ink)"
                : "var(--olive-ink-soft)",
          }}
          {...(bodyFieldKey ? fieldAttr(bodyFieldKey) : {})}
        >
          {body}
        </p>
      ) : null}

      {link ? (
        <OliveButton
          variant="ghost"
          href={link.href}
          className={cn(align === "start" && "self-start")}
          style={
            invert
              ? {
                  color: "var(--olive-white)",
                  textDecorationColor: "var(--olive-sage-tint)",
                }
              : undefined
          }
          data-sp-field={linkFieldKey}
        >
          {link.label}
        </OliveButton>
      ) : null}
    </div>
  );
}
