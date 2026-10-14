import Image from "next/image";

import { cn } from "~/lib/utils";

export type WealthPhotoTreatment = "tint" | "duotone" | "none";

type WealthPhotoProps = {
  src: string;
  alt: string;
  /** `tint` = flat forest multiply (~55%, hero photos); `duotone` = grayscale
   *  luminosity on primary + forest multiply 50% (stats photos); `none`. */
  treatment?: WealthPhotoTreatment;
  /** next/image `sizes` — set it to the rendered width. */
  sizes?: string;
  priority?: boolean;
  /** CSS object-position, e.g. "38% 50%". */
  objectPosition?: string;
  /** CSS aspect-ratio for the frame, e.g. "4 / 3". Omit when the parent
   *  class sizes the frame (e.g. `wealth-hero__media`). */
  aspect?: string;
  /** Small mono caps caption chip, bottom-left on forest. */
  caption?: React.ReactNode;
  className?: string;
  /** Rendered inside the frame after the image (overlays, badges). */
  children?: React.ReactNode;
};

/**
 * Cover-cropped photo frame (`.wealth-photo`) with the redesign's flat
 * color treatments. The frame is `position: relative` + `isolation`, the
 * image is next/image `fill`, so the frame's own size comes from `aspect`
 * or the caller's class. Forest shows behind while loading.
 */
export function WealthPhoto({
  src,
  alt,
  treatment = "none",
  sizes = "100vw",
  priority = false,
  objectPosition,
  aspect,
  caption,
  className,
  children,
}: WealthPhotoProps) {
  return (
    <div
      className={cn(
        "wealth-photo",
        treatment !== "none" && `wealth-photo--${treatment}`,
        className,
      )}
      style={aspect ? { aspectRatio: aspect } : undefined}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        style={objectPosition ? { objectPosition } : undefined}
      />
      {caption ? <span className="wealth-photo__cap">{caption}</span> : null}
      {children}
    </div>
  );
}
