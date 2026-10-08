import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";

import { cn } from "~/lib/utils";

import { gloveButtonClass } from "./glove-button";

type GloveStyleCardProps = {
  name: string;
  /** Short Lato blurb under the name. Blank hides it. */
  blurb?: string;
  image: string;
  imageAlt?: string;
  href: string;
  /** Label of the small purple button. Blank hides the button. */
  buttonLabel?: string;
  /** Circle diameter in px at desktop. Default 180. */
  size?: number;
  className?: string;
  style?: CSSProperties;
  /** Extra data attributes for editor hit-testing, e.g. `listItemAttr(...)`. */
  itemAttrs?: Record<string, string>;
};

/** Circular portrait, Poppins name, Lato blurb, small purple button. */
export function GloveStyleCard({
  name,
  blurb,
  image,
  imageAlt = "",
  href,
  buttonLabel,
  size = 180,
  className,
  style,
  itemAttrs,
}: GloveStyleCardProps) {
  return (
    <div
      className={cn(
        "glove-style-card flex h-full flex-col items-center text-center",
        className,
      )}
      style={style}
      {...itemAttrs}
    >
      <Link
        href={href}
        className="relative block overflow-hidden rounded-full bg-[var(--glove-cloud)]"
        style={{ width: size, maxWidth: "100%", aspectRatio: "1 / 1" }}
        // With a button below, the image is a duplicate pointer target: keep it
        // out of the tab order AND the a11y tree so it isn't a nameless link.
        aria-label={buttonLabel ? undefined : name}
        aria-hidden={buttonLabel ? true : undefined}
        tabIndex={buttonLabel ? -1 : undefined}
      >
        <Image
          src={image}
          alt={imageAlt}
          fill
          sizes={`${size}px`}
          className="glove-style-img object-cover"
        />
      </Link>
      <h3 className="glove-display mt-5 text-[18px] font-medium text-[var(--glove-ink)]">
        {name}
      </h3>
      {blurb ? (
        <p className="mt-2 max-w-[260px] text-[15px] leading-relaxed text-[var(--glove-text)]">
          {blurb}
        </p>
      ) : null}
      {buttonLabel ? (
        <div className="mt-auto pt-4">
          <Link href={href} className={gloveButtonClass({ size: "sm" })}>
            {buttonLabel}
            <span className="sr-only"> for {name}</span>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
