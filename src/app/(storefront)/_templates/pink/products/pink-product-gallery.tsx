"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

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
 * component's dialog (`product-gallery-vertical-sticky.tsx:59-79`), plus
 * (B6.1) visible prev/next buttons, ArrowLeft/ArrowRight stepping and an
 * "n / total" `aria-live` counter — all hidden for a single image, where the
 * focus trap cycles the close button alone.
 */
export function PinkProductGallery({ images, productName, badge }: Props) {
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const { variantImageUrl } = useVariantImage();
  const shouldReduce = useReducedMotion();

  const enlargeBtnRef = useRef<HTMLButtonElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const prevBtnRef = useRef<HTMLButtonElement>(null);
  const nextBtnRef = useRef<HTMLButtonElement>(null);

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

  const goToPrev = () => setActive((i) => (i - 1 + list.length) % list.length);
  const goToNext = () => setActive((i) => (i + 1) % list.length);

  // Move focus to the close button once the lightbox mounts.
  useEffect(() => {
    if (!lightboxOpen) return;
    const t = setTimeout(() => closeBtnRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [lightboxOpen]);

  // Escape closes; ArrowLeft/ArrowRight step through images (multi-image
  // only); Tab cycles the focus trap through close → prev → next (prev/next
  // dropped from the cycle for a single image, since they aren't rendered).
  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeLightbox();
        return;
      }
      if (hasThumbs && e.key === "ArrowRight") {
        e.preventDefault();
        goToNext();
        return;
      }
      if (hasThumbs && e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrev();
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        const trapOrder = hasThumbs
          ? [closeBtnRef, prevBtnRef, nextBtnRef]
          : [closeBtnRef];
        const currentIndex = trapOrder.findIndex(
          (ref) => ref.current === document.activeElement,
        );
        const delta = e.shiftKey ? -1 : 1;
        const nextIndex =
          currentIndex === -1
            ? 0
            : (currentIndex + delta + trapOrder.length) % trapOrder.length;
        trapOrder[nextIndex]?.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // goToNext/goToPrev close over `list`, which is stable per render; only
    // re-binding on open/thumb-count changes avoids resubscribing every
    // keystroke-driven re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen, hasThumbs, list.length]);

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
            <div
              key={img.id}
              className="absolute inset-0 transition-opacity duration-500"
              style={{ opacity: active === i ? 1 : 0 }}
            >
              {/* Ambient backdrop: tiny blurred self-copy fills the 4:5
                  letterbox as a glow over var(--pink-panel) (same recipe as
                  the shared gallery's mainImageFit="contain"). scale-125
                  suffices at this ~45vw frame; rendered per image so the
                  backdrop cross-fades in lockstep with its foreground. */}
              <Image
                src={img.url}
                alt=""
                aria-hidden="true"
                fill
                sizes="128px"
                className="scale-125 object-cover opacity-90 blur-2xl saturate-125"
              />
              <Image
                src={img.url}
                alt={img.altText ?? productName}
                fill
                priority={i === 0}
                className="object-contain"
                sizes="(max-width: 640px) 100vw, 45vw"
              />
            </div>
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

            {/* Prev/next — hidden for a single image, where the trap only
                cycles the close button. */}
            {hasThumbs && (
              <>
                <button
                  ref={prevBtnRef}
                  type="button"
                  onClick={goToPrev}
                  aria-label="Previous image"
                  className="absolute top-1/2 left-3 flex -translate-y-1/2 items-center justify-center"
                  style={{
                    width: 40,
                    height: 40,
                    background: "var(--pink-white)",
                    border: "1px solid var(--pink-line)",
                  }}
                >
                  <ChevronLeft
                    className="h-4 w-4"
                    style={{ color: "var(--pink-ink)" }}
                    aria-hidden="true"
                  />
                </button>
                <button
                  ref={nextBtnRef}
                  type="button"
                  onClick={goToNext}
                  aria-label="Next image"
                  className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center justify-center"
                  style={{
                    width: 40,
                    height: 40,
                    background: "var(--pink-white)",
                    border: "1px solid var(--pink-line)",
                  }}
                >
                  <ChevronRight
                    className="h-4 w-4"
                    style={{ color: "var(--pink-ink)" }}
                    aria-hidden="true"
                  />
                </button>
                <div
                  aria-live="polite"
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[12px] font-medium"
                  style={{
                    background: "var(--pink-white)",
                    padding: "4px 10px",
                    border: "1px solid var(--pink-line)",
                    color: "var(--pink-ink)",
                  }}
                >
                  {active + 1} / {list.length}
                </div>
              </>
            )}
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
