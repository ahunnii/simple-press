import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { hasOliveImage, OliveImageFallback } from "./olive-image-fallback";

type OliveImageTileProps = {
  image: string;
  /** Describes the photograph. The label is read separately, so do not repeat it. */
  alt: string;
  label: string;
  /** Template field key whose value is exactly `label`; enables editor live text. */
  labelFieldKey?: string;
  href: string;
  /** Optional tracked-caps line with an arrow. Not itself interactive. */
  cta?: string;
  priority?: boolean;
  /** Passed to next/image. Defaults to a two-up row. */
  sizes?: string;
  className?: string;
  style?: CSSProperties;
};

/**
 * OliveImageTile — the big 2-up photograph with its label printed straight
 * on it (mood tiles).
 *
 * Portrait on a phone (4:5) and landscape on a laptop (3:2). A bottom-up
 * espresso scrim (`.olive-image-tile-scrim`) carries an ivory Bodoni label and
 * an optional tracked-caps line with a drawn arrow; the photograph pushes in
 * to 1.03 on hover / focus. Square, no frame.
 */
export function OliveImageTile({
  image,
  alt,
  label,
  labelFieldKey,
  href,
  cta,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 50vw",
  className,
  style,
}: OliveImageTileProps) {
  return (
    <Link
      href={href}
      className={cn(
        "olive-image-tile group aspect-[4/5] md:aspect-[3/2]",
        className,
      )}
      style={style}
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

      <span aria-hidden="true" className="olive-image-tile-scrim" />

      <span className="olive-on-photo pointer-events-none absolute inset-x-0 bottom-0 z-[2] flex flex-col items-start gap-2 p-5 sm:p-7">
        <span
          className="olive-h3"
          {...(labelFieldKey ? fieldAttr(labelFieldKey) : {})}
        >
          {label}
        </span>
        {cta ? (
          <span className="olive-label inline-flex items-center gap-2">
            {cta}
            <ArrowRight
              aria-hidden="true"
              className="olive-btn-arrow"
              size={14}
              strokeWidth={1.5}
            />
          </span>
        ) : null}
      </span>
    </Link>
  );
}
