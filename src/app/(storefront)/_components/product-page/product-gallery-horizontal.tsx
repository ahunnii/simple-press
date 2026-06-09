"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { cn } from "~/lib/utils";

type StyleProps = {
  containerClassName?: string;
  singleImageContainerClassName?: string;
  multipleImagesContainerClassName?: string;
  buttonClassName?: string;
  selectedButtonClassName?: string;
  unselectedButtonClassName?: string;
};

type Props = {
  images: { url: string }[];
  productName: string;
  styleProps?: StyleProps;
  enableLightbox?: boolean;
};

export function ProductGalleryHorizontal({
  images,
  productName,
  styleProps,
  enableLightbox = false,
}: Props) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const hasMultipleImages = images.length > 1;
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const enlargeBtnRef = useRef<HTMLButtonElement>(null);
  const shouldReduceMotion = useReducedMotion();

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
          "flex flex-col gap-3 lg:flex-row-reverse",
          styleProps?.containerClassName,
        )}
      >
        {/* Main Image */}

        {enableLightbox ? (
          <button
            ref={enlargeBtnRef}
            type="button"
            onClick={() => setLightboxOpen(true)}
            className={cn(
              "bg-secondary relative aspect-square min-w-0 flex-1 cursor-zoom-in overflow-hidden rounded-2xl",
              styleProps?.singleImageContainerClassName,
            )}
            aria-label="Enlarge image"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedImage}
                initial={shouldReduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.25 }}
                className="absolute inset-0"
              >
                <Image
                  src={images[selectedImage]?.url ?? "/placeholder.svg"}
                  alt={productName}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </motion.div>
            </AnimatePresence>
          </button>
        ) : (
          <div
            className={cn(
              "bg-secondary relative aspect-square min-w-0 flex-1 overflow-hidden rounded-2xl",
              styleProps?.singleImageContainerClassName,
            )}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedImage}
                initial={shouldReduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.25 }}
                className="absolute inset-0"
              >
                <Image
                  src={images[selectedImage]?.url ?? "/placeholder.svg"}
                  alt={productName}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* Thumbnail Strip */}
        {hasMultipleImages && (
          <div
            className={cn(
              "flex flex-row gap-2 lg:flex-col",
              styleProps?.multipleImagesContainerClassName,
            )}
          >
            {images.map((img, i) => (
              <button
                key={img.url}
                type="button"
                onClick={() => setSelectedImage(i)}
                aria-label={`View image ${i + 1}`}
                aria-pressed={selectedImage === i}
                className={cn(
                  `relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border transition-all duration-200 ${
                    selectedImage === i
                      ? `border-primary opacity-100 ${styleProps?.selectedButtonClassName}`
                      : `border-border opacity-50 hover:opacity-80 ${styleProps?.unselectedButtonClassName}`
                  }`,
                )}
              >
                <Image
                  src={img.url}
                  alt=""
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
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0 }}
            transition={
              shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }
            }
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={closeLightbox}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={`${productName} — enlarged image`}
              initial={shouldReduceMotion ? false : { scale: 0.92, opacity: 0 }}
              animate={
                shouldReduceMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }
              }
              exit={
                shouldReduceMotion ? undefined : { scale: 0.92, opacity: 0 }
              }
              transition={
                shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }
              }
              className="relative max-h-[90vh] max-w-[90vw]"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={images[selectedImage]?.url ?? "/placeholder.svg"}
                alt={productName}
                width={1200}
                height={1200}
                className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain"
              />
              <button
                ref={closeBtnRef}
                type="button"
                onClick={closeLightbox}
                aria-label="Close"
                className="bg-background/80 hover:bg-background absolute top-3 right-3 rounded-full p-1.5 backdrop-blur-sm transition-colors"
              >
                <X className="size-5" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
