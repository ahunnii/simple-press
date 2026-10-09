import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "~/lib/utils";

import { gloveButtonClass } from "./glove-button";
import { GloveHandIcon } from "./glove-hand-icon";

type GloveStyleCardProps = {
  name: string;
  /** Short Lato blurb under the name. Blank hides it. */
  blurb?: string;
  /** Photo URL. Blank shows a mist circle with the glove glyph. */
  image?: string | null;
  imageAlt?: string;
  href: string;
  /** Label of the call to action under the card. Blank hides it. */
  buttonLabel?: string;
  /**
   * "button": a small purple button-looking span (homepage styles).
   * "text": a quiet "{buttonLabel} {name} →" line (collections grids).
   */
  affordance?: "button" | "text";
  /** Circle diameter in px at desktop. Default 180. */
  size?: number;
  className?: string;
  style?: CSSProperties;
  /** Extra data attributes for editor hit-testing, e.g. `listItemAttr(...)`. */
  itemAttrs?: Record<string, string>;
};

/**
 * Circular portrait, Poppins name, Lato blurb and a call to action. The whole
 * card is ONE link named by the collection / style (the call to action is a
 * decorative span inside it, never a second link), so a grid of nine cards is
 * nine tab stops, not eighteen. The circle has a mist fill and a mist-line ring
 * so a white-background photo (charms) still reads as a circle on white; the
 * photo multiplies into the fill.
 */
export function GloveStyleCard({
  name,
  blurb,
  image,
  imageAlt = "",
  href,
  buttonLabel,
  affordance = "button",
  size = 180,
  className,
  style,
  itemAttrs,
}: GloveStyleCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "glove-style-card flex h-full flex-col items-center text-center no-underline",
        className,
      )}
      style={style}
      {...itemAttrs}
    >
      <span
        className="glove-style-circle relative block overflow-hidden rounded-full border border-[var(--glove-mist-line)] bg-[var(--glove-mist)]"
        style={{ width: size, maxWidth: "100%", aspectRatio: "1 / 1" }}
      >
        {image ? (
          <Image
            src={image}
            alt={imageAlt}
            fill
            sizes={`${size}px`}
            className="glove-style-img object-cover"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-[var(--glove-primary)]">
            <GloveHandIcon className="size-[44%]" />
          </span>
        )}
      </span>
      <h3 className="glove-display mt-5 text-[18px] font-medium text-[var(--glove-ink)]">
        {name}
      </h3>
      {blurb ? (
        <p className="mt-2 max-w-[260px] text-[15px] leading-relaxed text-[var(--glove-text)]">
          {blurb}
        </p>
      ) : null}
      {buttonLabel ? (
        affordance === "text" ? (
          <span
            aria-hidden="true"
            className="glove-style-cta glove-display mt-auto pt-3 text-[14px] font-medium text-[var(--glove-primary)]"
          >
            {buttonLabel} {name}
            <ArrowRight
              aria-hidden="true"
              className="glove-style-cta-arrow ml-1 inline size-4 align-[-3px]"
            />
          </span>
        ) : (
          <span className="mt-auto pt-4">
            <span className={gloveButtonClass({ size: "sm" })}>
              {buttonLabel}
            </span>
          </span>
        )
      ) : null}
    </Link>
  );
}
