import Image from "next/image";

import type { WealthTone } from "./wealth-block";
import { cn } from "~/lib/utils";

import { wealthToneClass } from "./wealth-block";

type WealthCtaBandProps = {
  /** Italic Jost line — the band's heading. */
  heading: React.ReactNode;
  eyebrow?: React.ReactNode;
  body?: React.ReactNode;
  /** The action — usually a `WealthLedgeButton` with `onDark`. */
  action?: React.ReactNode;
  /** Optional faint photo under the band (grayscale, 22%, luminosity). */
  bgImage?: string | null;
  tone?: Extract<WealthTone, "forest" | "primary">;
  headingAs?: "h2" | "h3";
  headingId?: string;
  /** Editor wiring: spread `fieldAttr(...)` on each text element. */
  eyebrowProps?: Record<string, string>;
  headingProps?: Record<string, string>;
  bodyProps?: Record<string, string>;
  as?: "section" | "div" | "aside";
  className?: string;
} & Omit<React.HTMLAttributes<HTMLElement>, "className">;

/**
 * Forest CTA band (design.md redesign "wealth-cta-band"): eyebrow, italic
 * line, body and an action on the right (≥900px). Carries its own padding
 * (85% of the section rhythm). Server component; extra attributes
 * (`aria-labelledby`, `sectionGroupAttr(...)`) land on the root.
 */
export function WealthCtaBand({
  heading,
  eyebrow,
  body,
  action,
  bgImage,
  tone = "forest",
  headingAs: HeadingTag = "h2",
  headingId,
  eyebrowProps,
  headingProps,
  bodyProps,
  as: Tag = "section",
  className,
  ...rest
}: WealthCtaBandProps) {
  return (
    <Tag
      {...rest}
      className={cn("wealth-cta-band", wealthToneClass(tone), className)}
    >
      {bgImage?.trim() ? (
        <div className="wealth-cta-band__bg" aria-hidden="true">
          <Image src={bgImage} alt="" fill sizes="100vw" />
        </div>
      ) : null}
      <div className="wealth-container wealth-cta-band__inner">
        <div className="wealth-cta-band__text">
          {eyebrow ? (
            <p
              {...eyebrowProps}
              className="wealth-eyebrow wealth-eyebrow--block"
            >
              {eyebrow}
            </p>
          ) : null}
          {heading !== "" && heading != null ? (
            <HeadingTag
              {...headingProps}
              id={headingId}
              className="wealth-cta-band__line"
            >
              {heading}
            </HeadingTag>
          ) : null}
          {body ? (
            <p {...bodyProps} className="wealth-cta-band__body">
              {body}
            </p>
          ) : null}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
    </Tag>
  );
}
