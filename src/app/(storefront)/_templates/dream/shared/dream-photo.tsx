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
  /**
   * How the photo meets the frame. `"cover"` (default) crops to fill it.
   * `"contain"` shows the whole photo over a blurred, enlarged copy of itself
   * (`.dream-photo-backdrop`), so a mismatched shape never leaves bare bars.
   */
  fit?: "cover" | "contain";
  /** Message forwarded to `DreamImageFallback` for the empty state. */
  fallbackMessage?: string;
  /** Tone forwarded to `DreamImageFallback` for the empty state. Defaults to "sky". */
  fallbackTone?: "sky" | "paper" | "warm";
  /**
   * Extra attributes spread onto the `<figure>` — used to pass a visual-editor
   * hook such as `listItemAttr(...)` for a photo that is one row of a list.
   */
  attrs?: Readonly<Record<`data-${string}`, string>>;
};

/**
 * Rounded-26px hairline-framed photo (design.md palette: "rounded-26px
 * photo frames with a hairline"). Raw `<img>` — not `next/image` — per this
 * component's brief. `fit="cover"` (default) fills the frame with
 * `object-fit: cover`; `fit="contain"` shows the whole photo on a soft
 * blurred backdrop of the same image (decorative, `alt=""`). Falls back to
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
  fit = "cover",
  fallbackMessage,
  fallbackTone,
  attrs,
}: DreamPhotoProps) {
  const isEmpty = src === "" || src === "/placeholder.svg";
  const contain = fit === "contain";
  const style = aspect ? ({ aspectRatio: aspect } as CSSProperties) : undefined;

  return (
    <figure className={cn("dream-photo", className)} style={style} {...attrs}>
      {isEmpty ? (
        <DreamImageFallback
          className="dream-photo-fallback"
          message={fallbackMessage}
          tone={fallbackTone}
        />
      ) : (
        <>
          {contain && (
            <img
              src={src}
              alt=""
              aria-hidden="true"
              className="dream-photo-backdrop"
              loading={priority ? "eager" : "lazy"}
              decoding="async"
            />
          )}
          <img
            src={src}
            alt={alt}
            className={cn("dream-photo-img", contain && "is-contain")}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
          />
        </>
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
