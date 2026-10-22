import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { hasOliveImage, OliveImageFallback } from "./olive-image-fallback";

type OliveCategoryCardProps = {
  image: string;
  /** Describes the photograph. The label is read separately, so do not repeat it. */
  alt: string;
  label: string;
  /** Template field key whose value is exactly `label`; enables editor live text. */
  labelFieldKey?: string;
  href: string;
  /**
   * @deprecated Retired with the chip-tabbed card (design.md, 2026-10-21).
   * Accepted and ignored so older call sites compile.
   */
  chipColor?: string;
  /** Optional quiet count under the caption, e.g. "18 pieces" (taupe-ink). */
  count?: string;
  /** CSS aspect-ratio of the photograph. Defaults to `"4 / 5"`. */
  aspect?: string;
  priority?: boolean;
  /** Passed to next/image. Defaults to a quarter-width four-up row. */
  sizes?: string;
  className?: string;
  style?: CSSProperties;
};

/**
 * OliveCategoryCard — the occasion tile ("EVERYDAY ELEVATED", "AFTER HOURS").
 *
 * A photograph (4:5 by default) with a centred tracked-caps caption below it
 * and an optional count. The whole tile is one link; the photograph pushes
 * in to 1.03 on hover / focus (`.olive-photo-push`, reduced-motion safe).
 * No frame, no tab, no chip.
 */
export function OliveCategoryCard({
  image,
  alt,
  label,
  labelFieldKey,
  href,
  count,
  aspect = "4 / 5",
  priority = false,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
  className,
  style,
}: OliveCategoryCardProps) {
  return (
    <Link
      href={href}
      className={cn("olive-occasion-tile group", className)}
      style={style}
    >
      <span
        className="olive-occasion-tile-media"
        style={{ aspectRatio: aspect }}
      >
        {hasOliveImage(image) ? (
          <Image
            src={image}
            alt={alt}
            fill
            priority={priority}
            sizes={sizes}
            className="olive-photo-push object-cover"
          />
        ) : (
          <OliveImageFallback className="absolute inset-0" />
        )}
      </span>

      <span className="olive-occasion-tile-caption">
        <span
          className="olive-label"
          {...(labelFieldKey ? fieldAttr(labelFieldKey) : {})}
        >
          {label}
        </span>
        {count ? (
          <span className="olive-occasion-tile-count">{count}</span>
        ) : null}
      </span>
    </Link>
  );
}
