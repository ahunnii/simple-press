import type { CSSProperties } from "react";

import { cn } from "~/lib/utils";

type OliveImageFallbackProps = {
  /** CSS `aspect-ratio`, e.g. `"3 / 4"`. Omit when the parent already sizes the box. */
  aspect?: string;
  /**
   * Override the initials drawn in the middle (default: the business's own,
   * from `--olive-initials` on the `.olive` root, set by olive-layout.tsx).
   */
  initials?: string;
  /** @deprecated The leaf mark is retired; accepted and ignored. */
  size?: number;
  className?: string;
  style?: CSSProperties;
};

/**
 * OliveImageFallback — a designed stand-in for a picture that does not exist.
 *
 * A fresh store has blank image fields and records without covers. This draws
 * the absence on purpose: a sand field with the business initials set in
 * Bodoni (stone, `.olive-image-fallback::before` in globals.css), so a
 * missing photo reads as "nothing here yet", not "broken". No icon.
 *
 * Decorative by construction — the alt text belongs to whatever the consuming
 * component would have rendered, so nothing here reaches the accessibility
 * tree.
 */
export function OliveImageFallback({
  aspect,
  initials,
  className,
  style,
}: OliveImageFallbackProps) {
  const override = initials?.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 3);
  return (
    <div
      aria-hidden="true"
      className={cn("olive-image-fallback h-full w-full", className)}
      style={
        {
          ...(aspect ? { aspectRatio: aspect } : {}),
          ...(override ? { "--olive-initials": `"${override}"` } : {}),
          ...style,
        } as CSSProperties
      }
    />
  );
}

/**
 * True when `src` is a real, owner-supplied image. Several platform fields
 * ship `/placeholder.svg` as their default, so a bare truthiness check would
 * render the platform's grey placeholder instead of the template's own
 * fallback — use this everywhere an image src might be blank.
 */
export function hasOliveImage(src: string | null | undefined): boolean {
  return (
    typeof src === "string" &&
    src.trim().length > 0 &&
    src !== "/placeholder.svg"
  );
}
