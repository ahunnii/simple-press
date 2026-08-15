"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";

import { cn } from "~/lib/utils";
import { useReducedMotion } from "~/hooks/use-reduced-motion";
import { useVariantImage } from "~/app/(storefront)/_components/product-page/variant-image-context";

import { PinkBadge } from "../shared/pink-badge";

type GalleryImage = { id: string; url: string; altText?: string | null };

type Props = {
  images: GalleryImage[];
  productName: string;
  badge?: { label: string; tone?: "rose" | "ink" };
};

/**
 * The product gallery: `74px minmax(0,1fr)` sticky vertical thumbnail column
 * beside a 4:5 main frame that cross-fades between views, plus a corner
 * badge (design.md → Product → "Gallery"). Fully DB-driven — no template
 * fields. Syncs with the variant selector via `useVariantImage`.
 *
 * Ports a full-screen zoom lightbox in place, rather than adopting
 * `_components/product-page/product-gallery-vertical-sticky.tsx` directly
 * (review 2026-07-29, F2). That shared component's thumbnail rail is a
 * wrap-below strip, not pink's vertical sticky `74px` column, and its main
 * frame doesn't carry pink's cross-fade/variant-sync behavior — adopting it
 * wholesale would mean rebuilding the layout inside the shared component
 * (an orchestrator-retained file this agent cannot edit) rather than in this
 * one, already-owned file. Porting keeps design.md's layout pixel-identical
 * while closing the actual gap the finding cared about: focus trap,
 * Escape-to-close and `useReducedMotion`, mirrored from the shared
 * component's dialog (`product-gallery-vertical-sticky.tsx:59-79`).
 */
export function PinkProductGallery({ images, productName, badge }: Props) {
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const { variantImageUrl } = useVariantImage();
  const shouldReduce = useReducedMotion();

  const enlargeBtnRef = useRef<HTMLButtonElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!variantImageUrl) return;
    const idx = images.findIndex((img) => img.url === variantImageUrl);
    if (idx >= 0) setActive(idx);
  }, [variantImageUrl, images]);

  const list =
    images.length > 0
      ? images
      : [{ id: "placeholder", url: "/placeholder.svg", altText: productName }];
  // The thumbnail column only renders for multi-image products. Keeping the
  // `74px _ 1fr` track list in the single-image case put the MAIN frame in the
  // 74px column — a thumbnail-sized hero beside an empty half-page.
  const hasThumbs = list.length > 1;
  const activeImage = list[active] ?? list[0];

  const closeLightbox = () => {
    setLightboxOpen(false);
    setTimeout(() => enlargeBtnRef.current?.focus(), 50);
  };

  // Move focus to the close button once the lightbox mounts.
  useEffect(() => {
    if (!lightboxOpen) return;
    const t = setTimeout(() => closeBtnRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [lightboxOpen]);

  // Escape closes; Tab is trapped on the close button — the only
  // interactive element inside the dialog.
  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeLightbox();
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        closeBtnRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen]);

  return (
    <>
      <div
        className={cn(
          "grid gap-3 sm:sticky sm:top-[var(--pink-sticky-top)] sm:items-start sm:self-start",
          hasThumbs && "sm:grid-cols-[74px_minmax(0,1fr)]",
        )}
      >
        {/* ── Vertical thumbnail column (desktop) ── */}
        {list.length > 1 && (
          <div
            role="group"
            aria-label="Product image thumbnails"
            className="hidden flex-col gap-2.5 sm:flex"
          >
            {list.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`View image ${i + 1}`}
                aria-pressed={active === i}
                className="relative overflow-hidden"
                style={{
                  aspectRatio: "1 / 1",
                  background: "var(--pink-ink-tint)",
                  border:
                    active === i
                      ? "1px solid var(--pink-rose)"
                      : "1px solid var(--pink-line)",
                }}
              >
                <Image
                  src={img.url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="74px"
                />
              </button>
            ))}
          </div>
        )}

        {/* ── Main frame — cross-fades between views, opens the lightbox ── */}
        <button
          ref={enlargeBtnRef}
          type="button"
          onClick={() => setLightboxOpen(true)}
          aria-label="Enlarge image"
          aria-haspopup="dialog"
          className="relative block w-full cursor-zoom-in overflow-hidden border-0 p-0 text-left"
          style={{
            aspectRatio: "4 / 5",
            background: "var(--pink-panel)",
            font: "inherit",
          }}
        >
          {list.map((img, i) => (
            <Image
              key={img.id}
              src={img.url}
              alt={img.altText ?? productName}
              fill
              priority={i === 0}
              className="object-cover transition-opacity duration-500"
              style={{ opacity: active === i ? 1 : 0 }}
              sizes="(max-width: 640px) 100vw, 45vw"
            />
          ))}
          {badge && (
            <span className="absolute top-3 left-3">
              <PinkBadge tone={badge.tone}>{badge.label}</PinkBadge>
            </span>
          )}
        </button>

        {/* ── Horizontal thumbnail strip (mobile) ── */}
        {list.length > 1 && (
          <div
            role="group"
            aria-label="Product image thumbnails"
            className="grid grid-cols-4 gap-2 sm:hidden"
          >
            {list.slice(0, 4).map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`View image ${i + 1}`}
                aria-pressed={active === i}
                className="relative overflow-hidden"
                style={{
                  aspectRatio: "1 / 1",
                  background: "var(--pink-ink-tint)",
                  border:
                    active === i
                      ? "1px solid var(--pink-rose)"
                      : "1px solid var(--pink-line)",
                }}
              >
                <Image
                  src={img.url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="25vw"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Lightbox ── */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: "var(--pink-scrim)",
            animation: shouldReduce
              ? undefined
              : "pink-lightbox-scrim-in .2s var(--pink-ease)",
          }}
          onClick={closeLightbox}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${productName} — enlarged image`}
            className="relative max-h-[90vh] max-w-[90vw]"
            style={{
              animation: shouldReduce
                ? undefined
                : "pink-lightbox-panel-in .2s var(--pink-ease)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={activeImage?.url ?? "/placeholder.svg"}
              alt={activeImage?.altText ?? productName}
              width={1400}
              height={1750}
              className="max-h-[90vh] max-w-[90vw] object-contain"
            />
            <button
              ref={closeBtnRef}
              type="button"
              onClick={closeLightbox}
              aria-label="Close enlarged image"
              className="absolute top-3 right-3 flex items-center justify-center"
              style={{
                width: 40,
                height: 40,
                background: "var(--pink-white)",
                border: "1px solid var(--pink-line)",
              }}
            >
              <X
                className="h-4 w-4"
                style={{ color: "var(--pink-ink)" }}
                aria-hidden="true"
              />
            </button>
          </div>
          {/* Keyframes declared inline (rather than in globals.css, which
              this agent doesn't own) and skipped entirely under reduced
              motion — see `animation` above. */}
          <style>{`
            @keyframes pink-lightbox-scrim-in { from { opacity: 0; } to { opacity: 1; } }
            @keyframes pink-lightbox-panel-in { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
          `}</style>
        </div>
      )}
    </>
  );
}
