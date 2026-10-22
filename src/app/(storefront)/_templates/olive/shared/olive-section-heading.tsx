import type { CSSProperties, ReactNode } from "react";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { OliveButton } from "./olive-button";

/**
 * `ink` — the light grounds (ivory, sand, stone).
 * `invert` — a dark field (espresso, moss) or a scrimmed photograph.
 * `slate` — legacy alias for the stone ground (espresso secondary text).
 */
export type OliveSectionHeadingTone = "ink" | "invert" | "slate";

type OliveSectionHeadingProps = {
  heading: string;
  /** `h2` (default) or `h1` for the one page title. Picks the matching type class. */
  as?: "h1" | "h2";
  /** Applied as `id` on the heading — pair with `aria-labelledby` on the section. */
  id?: string;
  /** Small tracked caps above the title ("THE EDIT"). Hidden when empty. */
  eyebrow?: ReactNode;
  /** Full template field key for `eyebrow`, when it is a live-patchable field. */
  eyebrowField?: string;
  /**
   * Spaced Bodoni capitals (`.olive-section-title`, "NEW ARRIVALS") instead of
   * the sentence-case `.olive-h2` / `.olive-h1`.
   */
  caps?: boolean;
  /** One line of body copy. */
  body?: string;
  /**
   * Trailing text link ("SHOP ALL →"), drawn as the `link` button with an
   * arrow. At md+ it sits right-aligned on the title's baseline; below md it
   * follows the body.
   */
  link?: { label: string; href: string };
  align?: "start" | "center";
  tone?: OliveSectionHeadingTone;
  /** Full template field keys, when these strings are live-patchable fields. */
  headingFieldKey?: string;
  bodyFieldKey?: string;
  linkFieldKey?: string;
  className?: string;
  style?: CSSProperties;
};

/**
 * OliveSectionHeading — the heading block of every editorial section.
 *
 * Optional eyebrow, the title (`caps` → spaced Bodoni capitals, otherwise the
 * sentence-case Bodoni h2/h1), optional body, optional trailing link. The
 * client's board pins eyebrows above headings, so design.md (2026-10-21)
 * replaces the old "no kicker" rule: an eyebrow is allowed, but it is always
 * short, real copy — never a section number.
 */
export function OliveSectionHeading({
  heading,
  as = "h2",
  id,
  eyebrow,
  eyebrowField,
  caps = false,
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
  const hasEyebrow =
    eyebrow !== undefined &&
    eyebrow !== null &&
    !(typeof eyebrow === "string" && eyebrow.trim().length === 0);

  const titleClass = caps
    ? "olive-section-title"
    : as === "h1"
      ? "olive-h1"
      : "olive-h2";

  // On a dark field the scoped type classes are flipped by `.olive-invert`
  // in globals.css; `slate` (the stone ground) keeps secondary text espresso.
  const bodyColor = invert
    ? "var(--olive-on-dark-soft)"
    : tone === "slate"
      ? "var(--olive-espresso)"
      : "var(--olive-ink-soft)";

  const sideLink = link !== undefined && align === "start";

  // One grid, one link element: below md everything stacks (eyebrow + title,
  // body, link); from md the link moves to the title row's right edge and
  // sits on its baseline.
  return (
    <div
      className={cn(
        "grid gap-4",
        sideLink && "md:grid-cols-[minmax(0,1fr)_auto] md:gap-x-8",
        invert && "olive-invert",
        align === "center" && "justify-items-center text-center",
        className,
      )}
      style={style}
    >
      <div
        className={cn(
          "flex flex-col gap-3",
          sideLink && "md:col-start-1 md:row-start-1",
          align === "center" && "items-center",
        )}
      >
        {hasEyebrow ? (
          <p
            className="olive-eyebrow"
            {...(eyebrowField ? fieldAttr(eyebrowField) : {})}
          >
            {eyebrow}
          </p>
        ) : null}
        <Heading
          id={id}
          className={titleClass}
          {...(headingFieldKey ? fieldAttr(headingFieldKey) : {})}
        >
          {heading}
        </Heading>
      </div>

      {body ? (
        <p
          className={cn(
            "max-w-[62ch] text-[0.9375rem] leading-[1.7]",
            sideLink && "md:col-start-1 md:row-start-2",
          )}
          style={{ color: bodyColor }}
          {...(bodyFieldKey ? fieldAttr(bodyFieldKey) : {})}
        >
          {body}
        </p>
      ) : null}

      {link ? (
        <OliveButton
          variant="link"
          arrow
          href={link.href}
          className={cn(
            "justify-self-start",
            sideLink && "md:col-start-2 md:row-start-1 md:self-end md:pb-1",
            align === "center" && "justify-self-center",
          )}
          data-sp-field={linkFieldKey}
        >
          {link.label}
        </OliveButton>
      ) : null}
    </div>
  );
}
