import type { CSSProperties } from "react";

import { cn } from "~/lib/utils";

import { OliveLeafMark } from "./olive-leaf-mark";

type OliveImageFallbackProps = {
  /** CSS `aspect-ratio`, e.g. `"3 / 4"`. Omit when the parent already sizes the box. */
  aspect?: string;
  /** Rendered size of the leaf mark in px. */
  size?: number;
  className?: string;
  style?: CSSProperties;
};

/**
 * OliveImageFallback — a designed stand-in for a picture that does not exist.
 *
 * A fresh store has blank image fields and records without covers; both used
 * to surface as an unexplained grey rectangle. This draws the absence instead:
 * the paper card face with the leaf rivet at 30% in the middle, so a missing
 * photo reads as "nothing here yet", not "broken".
 *
 * Decorative by construction — the alt text belongs to whatever the consuming
 * component would have rendered, so nothing here reaches the accessibility
 * tree.
 */
export function OliveImageFallback({
  aspect,
  size = 32,
  className,
  style,
}: OliveImageFallbackProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex h-full w-full items-center justify-center overflow-hidden",
        className,
      )}
      style={{
        backgroundColor: "var(--olive-paper)",
        color: "var(--olive-leaf)",
        ...(aspect ? { aspectRatio: aspect } : {}),
        ...style,
      }}
    >
      <OliveLeafMark size={size} className="opacity-30" />
    </div>
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
