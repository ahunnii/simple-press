import type { CSSProperties } from "react";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { DreamImageFallback } from "./dream-image-fallback";

type DreamPhotoProps = {
  src: string;
  alt: string;
  caption?: string;
  /** Field key backing `caption`, when it is exactly one field's value. */
  captionFieldKey?: string;
  /** CSS `aspect-ratio` value, e.g. `"4 / 5"`. */
  aspect?: string;
  className?: string;
  priority?: boolean;
  /** Message forwarded to `DreamImageFallback` for the empty state. */
  fallbackMessage?: string;
  /** Tone forwarded to `DreamImageFallback` for the empty state. Defaults to "sky". */
  fallbackTone?: "sky" | "paper" | "warm";
};

/**
 * Rounded-26px hairline-framed photo (design.md palette: "rounded-26px
 * photo frames with a hairline"). Raw `<img>` with `object-cover` — not
 * `next/image` — per this component's brief. Falls back to
 * `DreamImageFallback` when `src` is empty or the platform placeholder
 * (craft floor: "every image slot has a designed fallback").
 */
export function DreamPhoto({
  src,
  alt,
  caption,
  captionFieldKey,
  aspect,
  className,
  priority,
  fallbackMessage,
  fallbackTone,
}: DreamPhotoProps) {
  const isEmpty = src === "" || src === "/placeholder.svg";
  const style = aspect ? ({ aspectRatio: aspect } as CSSProperties) : undefined;

  return (
    <figure className={cn("dream-photo", className)} style={style}>
      {isEmpty ? (
        <DreamImageFallback
          className="dream-photo-fallback"
          message={fallbackMessage}
          tone={fallbackTone}
        />
      ) : (
        <img
          src={src}
          alt={alt}
          className="dream-photo-img"
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
        />
      )}
      {caption ? (
        <figcaption
          className="dream-photo-caption"
          {...(captionFieldKey ? fieldAttr(captionFieldKey) : {})}
        >
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
