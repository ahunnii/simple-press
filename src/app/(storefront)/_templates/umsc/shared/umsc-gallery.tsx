"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { cn } from "~/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "~/components/ui/dialog";

import { UmscRevealGroup } from "./umsc-reveal";

export type UmscGalleryImage = {
  id: string;
  url: string;
  altText?: string | null;
  caption?: string | null;
};

export type UmscGalleryData = {
  name?: string;
  description?: string | null;
  layout: string;
  columns: number;
  /** Ignored — umsc galleries always use the template's 16px shelf gap. */
  gap: number;
  showCaptions: boolean;
  enableLightbox: boolean;
  aspectRatio?: string | null;
  captionStyle?: string | null;
  images: UmscGalleryImage[];
};

type Props = {
  gallery: UmscGalleryData;
  /** Names the gallery in the lightbox title when `gallery.name` is unset. */
  label?: string;
  className?: string;
};

type UmscGalleryLayout = "grid" | "masonry" | "collage";

/** Collapses the stored layout to the three umsc arrangements. */
function resolveLayout(layout: string): UmscGalleryLayout {
  if (layout === "masonry") return "masonry";
  if (layout === "collage") return "collage";
  // grid / carousel / justified / anything unknown → the square shelf grid.
  return "grid";
}

/** umsc shelves read as 2–4 columns; anything else is clamped into range. */
function clampColumns(columns: number): number {
  if (!Number.isFinite(columns)) return 4;
  return Math.min(4, Math.max(2, Math.round(columns)));
}

/** Stored ratio → a CSS `aspect-ratio` value, or undefined for natural height. */
function aspectValue(ratio: string | null | undefined): string | undefined {
  switch (ratio) {
    case "1:1":
      return "1 / 1";
    case "4:3":
      return "4 / 3";
    case "16:9":
      return "16 / 9";
    case "3:4":
      return "3 / 4";
    default:
      // "original", null, and anything unrecognised.
      return undefined;
  }
}

/** Accessible name for a lightbox tile button — mirrors `imageButtonLabel`. */
function tileLabel(image: UmscGalleryImage, index: number): string {
  const name = image.altText ?? image.caption ?? `image ${index + 1}`;
  return `View ${name} larger`;
}

/**
 * UmscGallery — the umsc-native replacement for the generic
 * `GalleryRenderer` (design.md "Shared component inventory › UmscGallery").
 * Square-cornered hairline frames on cream, a 16px shelf gap, the 1.03 image
 * hover shared with `UmscProductCard`, a staggered `UmscRevealGroup` entrance,
 * and a black full-bleed lightbox with gold-soft chrome.
 *
 * Portal scope: `.umsc` and the `--font-umsc-*` next/font variables live on
 * the layout wrapper div (`layout/umsc-layout.tsx`), not on `<html>`. A Radix
 * portal at `document.body` would therefore drop every `--umsc-*` token, both
 * brand faces, and every `.umsc .umsc-foo` rule. So the lightbox portals INTO
 * the nearest `.umsc` ancestor, resolved from `rootRef` at click time (which
 * keeps it SSR-safe), with `document.body` only as a last resort.
 */
export function UmscGallery({ gallery, label, className }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const [index, setIndex] = useState<number | null>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);

  const images = gallery.images;
  const count = images.length;
  const layout = resolveLayout(gallery.layout);
  const cols = clampColumns(gallery.columns);
  // Natural height only for masonry columns or an explicit "original" ratio;
  // every other grid/collage shelf falls back to the square tile.
  const natural = layout === "masonry" || gallery.aspectRatio === "original";
  const aspect = natural
    ? undefined
    : (aspectValue(gallery.aspectRatio) ?? "1 / 1");
  const captionStyle = gallery.captionStyle ?? "overlay";
  const captionBelow = captionStyle === "below";

  if (count === 0) return null;

  const tileSizes = (i: number): string => {
    if (layout === "masonry") return "(max-width: 1023px) 50vw, 33vw";
    if (layout === "collage") {
      return i === 0
        ? "(max-width: 1023px) 100vw, 66vw"
        : "(max-width: 1023px) 50vw, 33vw";
    }
    return `(max-width: 1023px) 50vw, ${Math.round(100 / cols)}vw`;
  };

  const openAt = (i: number, trigger: HTMLElement) => {
    // Remember the tile that opened the lightbox so focus can be handed back
    // explicitly on close (see `onCloseAutoFocus` below).
    triggerRef.current = trigger;
    // Resolve the portal target at click time so SSR never touches the DOM.
    setContainer(
      rootRef.current?.closest<HTMLElement>(".umsc") ?? document.body,
    );
    setIndex(i);
  };

  const step = (delta: number) =>
    setIndex((prev) => (prev === null ? prev : (prev + delta + count) % count));

  const active = index !== null ? images[index] : null;
  const galleryName = label ?? gallery.name ?? "Gallery";

  return (
    <div ref={rootRef} className="umsc-gallery-root">
      <UmscRevealGroup
        className={cn("umsc-gallery", `umsc-gallery-${layout}`, className)}
        style={
          {
            "--umsc-gallery-cols": cols,
            "--umsc-gallery-aspect": aspect ?? "auto",
          } as React.CSSProperties
        }
      >
        {images.map((image, i) => {
          const overlayCaption =
            gallery.showCaptions && !captionBelow && image.caption ? (
              <span
                className={cn(
                  "umsc-sans umsc-gallery-cap",
                  captionStyle === "hover" && "umsc-gallery-cap-hover",
                )}
                aria-hidden={gallery.enableLightbox || undefined}
              >
                {image.caption}
              </span>
            ) : null;

          const picture = aspect ? (
            <Image
              src={image.url}
              alt={image.altText ?? ""}
              fill
              sizes={tileSizes(i)}
              loading="lazy"
              className="umsc-gallery-img object-cover"
            />
          ) : (
            <Image
              src={image.url}
              alt={image.altText ?? ""}
              width={1600}
              height={1200}
              sizes={tileSizes(i)}
              loading="lazy"
              className="umsc-gallery-img h-auto w-full"
            />
          );

          return (
            <figure
              key={image.id}
              className={cn(
                "umsc-gallery-tile umsc-reveal-item",
                layout === "collage" && i === 0 && "umsc-gallery-tile-lead",
              )}
              style={{ "--i": Math.min(i, 6) } as React.CSSProperties}
            >
              {gallery.enableLightbox ? (
                <button
                  type="button"
                  className="umsc-gallery-frame"
                  aria-label={tileLabel(image, i)}
                  onClick={(event) => openAt(i, event.currentTarget)}
                >
                  {picture}
                  {overlayCaption}
                </button>
              ) : (
                <div className="umsc-gallery-frame">
                  {picture}
                  {overlayCaption}
                </div>
              )}
              {gallery.showCaptions && captionBelow && image.caption && (
                <figcaption className="umsc-sans umsc-gallery-figcaption">
                  {image.caption}
                </figcaption>
              )}
            </figure>
          );
        })}
      </UmscRevealGroup>

      {gallery.enableLightbox && (
        <Dialog
          open={index !== null}
          onOpenChange={(open) => {
            if (!open) setIndex(null);
          }}
        >
          <DialogPortal container={container ?? undefined}>
            <DialogOverlay className="umsc-gallery-lightbox-overlay" />
            <DialogPrimitive.Content
              className="umsc-black-surface umsc-gallery-lightbox"
              aria-describedby={undefined}
              // Radix restores focus on close by itself, but this dialog has
              // no `DialogTrigger` and portals into a resolved-at-click-time
              // container, so its restore target comes back empty and focus
              // lands on <body>. Hand it back to the tile explicitly.
              // `onOpenAutoFocus` is left alone: Radix's default (the Close
              // button, first focusable in the bar) is the right entry point.
              onCloseAutoFocus={(e) => {
                e.preventDefault();
                triggerRef.current?.focus();
              }}
              onKeyDown={(e) => {
                if (count < 2) return;
                if (e.key === "ArrowRight") {
                  e.preventDefault();
                  step(1);
                } else if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  step(-1);
                }
              }}
            >
              <DialogTitle className="sr-only">
                {`${galleryName} — image ${(index ?? 0) + 1} of ${count}${
                  active?.altText ? `: ${active.altText}` : ""
                }`}
              </DialogTitle>

              <div className="umsc-gallery-lightbox-bar">
                <span
                  className="umsc-sans umsc-tabular umsc-gallery-lightbox-count"
                  aria-live="polite"
                >
                  {(index ?? 0) + 1} / {count}
                </span>
                <DialogClose
                  className="umsc-gallery-lightbox-btn"
                  aria-label="Close"
                >
                  <X strokeWidth={1.5} className="size-6" aria-hidden="true" />
                </DialogClose>
              </div>

              <div className="umsc-gallery-lightbox-stage">
                {active && (
                  <Image
                    key={active.id}
                    src={active.url}
                    alt={active.altText ?? ""}
                    fill
                    sizes="100vw"
                    priority
                    className="object-contain"
                  />
                )}
                {count > 1 && (
                  <>
                    <button
                      type="button"
                      className="umsc-gallery-lightbox-btn umsc-gallery-lightbox-prev"
                      aria-label="Previous image"
                      onClick={() => step(-1)}
                    >
                      <ChevronLeft
                        strokeWidth={1.5}
                        className="size-6"
                        aria-hidden="true"
                      />
                    </button>
                    <button
                      type="button"
                      className="umsc-gallery-lightbox-btn umsc-gallery-lightbox-next"
                      aria-label="Next image"
                      onClick={() => step(1)}
                    >
                      <ChevronRight
                        strokeWidth={1.5}
                        className="size-6"
                        aria-hidden="true"
                      />
                    </button>
                  </>
                )}
              </div>

              {gallery.showCaptions && active?.caption && (
                <p className="umsc-sans umsc-gallery-lightbox-caption">
                  {active.caption}
                </p>
              )}
            </DialogPrimitive.Content>
          </DialogPortal>
        </Dialog>
      )}
    </div>
  );
}
