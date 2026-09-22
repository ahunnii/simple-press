"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { cn } from "~/lib/utils";
import { useVariantImage } from "~/app/(storefront)/_components/product-page/variant-image-context";

/**
 * How long the `"swatch-turn"` wipe runs. Must stay in step with the
 * `olive-swatch-turn` / `olive-swatch-edge` keyframes in globals.css — it is
 * only used here to know when the covered leaf can be dropped.
 */
const SWATCH_TURN_MS = 520;

type StyleProps = {
  containerClassName?: string;
  singleImageContainerClassName?: string;
  multipleImagesContainerClassName?: string;
  buttonClassName?: string;
  selectedButtonClassName?: string;
  unselectedButtonClassName?: string;
};

type Props = {
  images: { url: string; altText?: string | null }[];
  productName: string;
  styleProps?: StyleProps;
  enableLightbox?: boolean;
  primaryColor?: string;
  /**
   * How the main photograph changes when the selection changes.
   *
   * `"fade"` — the default, and what every template has always had: the
   * 250ms opacity crossfade below. This component is shared by 15+ templates,
   * so the default path must stay byte-identical; the preset exists purely so
   * one template can opt out of it.
   *
   * `"swatch-turn"` — olive's focal moment. The incoming photograph is wiped
   * in left-to-right behind a narrow band in the chosen colour, so the change
   * reads as a leaf of a swatch book being turned rather than a dissolve. The
   * wipe itself is CSS (`.olive-swatch-turn` / `.olive-swatch-edge` in
   * globals.css); all this component contributes is putting the classes on
   * and remounting the band so its animation re-runs.
   */
  motionPreset?: "fade" | "swatch-turn";
  /**
   * The colour that rides the leading edge of the swatch turn. Left undefined
   * when there is no colour to speak of — the wipe then runs with the
   * template's own neutral edge rather than an invented tint. Ignored unless
   * `motionPreset` is `"swatch-turn"`.
   */
  accentColor?: string;
};

export function ProductGalleryVertical({
  images,
  productName,
  styleProps,
  enableLightbox = false,
  primaryColor,
  motionPreset = "fade",
  accentColor,
}: Props) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const hasMultipleImages = images.length > 1;

  const { variantImageUrl } = useVariantImage();
  // Jump to the variant's image when the selected variant changes.
  // Depend only on variantImageUrl so manual thumbnail clicks are not overridden.
  useEffect(() => {
    if (!variantImageUrl) return;
    const idx = images.findIndex((img) => img.url === variantImageUrl);
    if (idx >= 0) setSelectedImage(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantImageUrl]);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const enlargeBtnRef = useRef<HTMLButtonElement>(null);
  const shouldReduce = useReducedMotion();

  // Move focus to close button when lightbox opens
  useEffect(() => {
    if (!lightboxOpen) return;
    const t = setTimeout(() => closeBtnRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [lightboxOpen]);

  const closeLightbox = () => {
    setLightboxOpen(false);
    setTimeout(() => enlargeBtnRef.current?.focus(), 50);
  };

  // ── Swatch turn (opt-in; every other template stays on "fade") ──────────
  //
  // A swatch book never shows the counter between leaves, so the turn cannot
  // be a crossfade with a wipe bolted on: the outgoing photograph has to stay
  // exactly where it is while the incoming one is laid over it. That rules
  // out `AnimatePresence mode="wait"`, which holds the incoming element back
  // until the outgoing has finished exiting and leaves the frame empty in
  // between. So this preset does not use `AnimatePresence` at all — it keeps
  // the covered leaf itself, as an opaque static underlay, and drops it once
  // the wipe has finished. The clip-path reveal IS the reveal; there is no
  // opacity animation on the incoming photograph, because a fade on top of a
  // wipe muddies both.
  //
  // The turn must also never run on the first painted frame: the main <Image>
  // carries `priority` and is the product page's LCP element, and a clip-path
  // animation with `both` fill would paint it clipped. So `turns` starts at
  // 0 — making the first render a single plain, unclipped image on the server
  // and the client alike — and is only raised by an actual change of index.
  //
  // `turns` is raised while rendering rather than in an effect (React's
  // "adjust state when something changes" pattern) so the incoming element
  // carries its wipe class on its very first mounted frame. Raised in an
  // effect it would paint unclipped for one frame first, which reads as a
  // flash of the new photograph before the turn.
  const swatchTurn = motionPreset === "swatch-turn";
  const [stage, setStage] = useState({
    index: selectedImage,
    /** How many turns have happened. Also keys the colour band. */
    turns: 0,
    /** The leaf being covered, kept visible for the length of the wipe. */
    under: null as number | null,
  });
  if (stage.index !== selectedImage) {
    setStage({
      index: selectedImage,
      turns: swatchTurn ? stage.turns + 1 : stage.turns,
      under: swatchTurn ? stage.index : null,
    });
  }

  const { turns, under } = stage;

  // Drop the covered leaf once the wipe is over. A timer rather than
  // `onAnimationEnd`, because under reduced motion there is no animation to
  // end and the underlay would sit there for the rest of the session.
  useEffect(() => {
    if (under === null) return;
    const timer = setTimeout(
      () => setStage((current) => ({ ...current, under: null })),
      SWATCH_TURN_MS + 80,
    );
    return () => clearTimeout(timer);
  }, [under, turns]);

  const turning = swatchTurn && turns > 0;
  /** The frame the leaf turns inside; also where the band's tint is declared. */
  const stageClassName = swatchTurn ? "olive-swatch-stage" : undefined;
  const stageStyle: CSSProperties | undefined =
    swatchTurn && accentColor
      ? ({ "--olive-turn-tint": accentColor } as CSSProperties)
      : undefined;

  /** The photograph. `priority` only ever on the one that is current. */
  const photo = (index: number, isCurrent: boolean) => (
    <Image
      src={images[index]?.url ?? "/placeholder.svg"}
      alt={
        images[index]?.altText?.trim()
          ? (images[index]?.altText ?? "")
          : productName
      }
      fill
      className="object-cover"
      priority={isCurrent}
      sizes="(max-width: 1024px) 100vw, 50vw"
    />
  );

  /**
   * What sits inside the image frame. Identical markup in both container
   * branches below (the lightbox button and the plain div), so it is built
   * once here — the `"fade"` arm is the AnimatePresence block every template
   * has always rendered, untouched.
   *
   * Every child is prefix-keyed: the band's key is a turn count and the
   * leaf's is an image index, and two bare numbers as sibling keys would
   * eventually collide.
   */
  const stageContent = swatchTurn ? (
    <>
      {under !== null ? (
        <div
          key={`under-${under}`}
          className="absolute inset-0"
          aria-hidden="true"
        >
          {photo(under, false)}
        </div>
      ) : null}
      <div
        key={`leaf-${selectedImage}`}
        className={cn("absolute inset-0", turning && "olive-swatch-turn")}
      >
        {photo(selectedImage, true)}
      </div>
      {turning ? (
        <span
          key={`edge-${turns}`}
          className="olive-swatch-edge"
          aria-hidden="true"
        />
      ) : null}
    </>
  ) : (
    <AnimatePresence mode="wait">
      <motion.div
        key={selectedImage}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: shouldReduce ? 0 : 0.25 }}
        className="absolute inset-0"
      >
        {photo(selectedImage, true)}
      </motion.div>
    </AnimatePresence>
  );

  useEffect(() => {
    if (!enableLightbox || !lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeLightbox();
        return;
      }
      // Focus trap — only the close button is interactive in the lightbox
      if (e.key === "Tab") {
        e.preventDefault();
        closeBtnRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enableLightbox, lightboxOpen]);

  return (
    <>
      <div
        className={cn(
          //   "md:sticky md:top-24 md:col-span-5 md:self-start",
          "w-full",
          styleProps?.containerClassName,
        )}
      >
        {enableLightbox ? (
          <button
            ref={enlargeBtnRef}
            type="button"
            onClick={() => setLightboxOpen(true)}
            className={cn(
              "bg-secondary relative aspect-square w-full cursor-zoom-in overflow-hidden rounded-2xl",
              styleProps?.singleImageContainerClassName,
              stageClassName,
            )}
            style={stageStyle}
            aria-label="Enlarge image"
            aria-haspopup="dialog"
          >
            {stageContent}
          </button>
        ) : (
          <div
            className={cn(
              "bg-secondary relative aspect-square w-full overflow-hidden rounded-2xl",
              styleProps?.singleImageContainerClassName,
              stageClassName,
            )}
            style={stageStyle}
          >
            {stageContent}
          </div>
        )}

        {/* {selectedImage ? (
        <div
          className={cn(
            "relative aspect-square overflow-hidden rounded-lg bg-gray-100",
            styleProps?.singleImageContainerClassName,
          )}
        >
          <Image
            src={images[selectedImage]?.url ?? "/placeholder.svg"}
            alt={productName}
            fill
            className="object-cover"
            priority
          />
        </div>
      ) : (
        <div className="flex aspect-square items-center justify-center rounded-lg bg-gray-100">
          <span className="text-gray-400">No image</span>
        </div>
      )} */}

        {/* Thumbnail gallery */}
        {hasMultipleImages && (
          <div
            className={cn(
              "mt-4 flex flex-wrap gap-2",
              styleProps?.multipleImagesContainerClassName,
            )}
          >
            {images.map((image, index) => (
              <button
                key={image.url}
                onClick={() => setSelectedImage(index)}
                className={cn(
                  `relative aspect-square w-16 overflow-hidden rounded border-2 bg-gray-100 transition-all ${
                    selectedImage === index
                      ? `border-primary ring-primary ring-2 ${styleProps?.selectedButtonClassName}`
                      : `border-border hover:border-primary ${styleProps?.unselectedButtonClassName}`
                  }`,
                )}
                style={
                  selectedImage === index ? { borderColor: primaryColor } : {}
                }
                aria-label={`View image ${index + 1}`}
                aria-pressed={selectedImage === index}
              >
                <Image
                  src={image.url}
                  alt={
                    image.altText?.trim()
                      ? image.altText
                      : `${productName} ${index + 1}`
                  }
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduce ? 0 : 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={closeLightbox}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={`${productName} — enlarged image`}
              initial={{ scale: shouldReduce ? 1 : 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: shouldReduce ? 1 : 0.92, opacity: 0 }}
              transition={{ duration: shouldReduce ? 0 : 0.2 }}
              className="relative max-h-[90vh] max-w-[90vw]"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={images[selectedImage]?.url ?? "/placeholder.svg"}
                alt={
                  images[selectedImage]?.altText?.trim()
                    ? (images[selectedImage]?.altText ?? "")
                    : productName
                }
                width={1200}
                height={1200}
                className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain"
              />
              <button
                ref={closeBtnRef}
                type="button"
                onClick={closeLightbox}
                aria-label="Close enlarged image"
                className="bg-background/80 hover:bg-background absolute top-3 right-3 rounded-full p-1.5 backdrop-blur-sm transition-colors"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
