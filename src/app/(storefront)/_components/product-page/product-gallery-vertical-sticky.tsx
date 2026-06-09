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
  primaryColor?: string;
};

export function ProductGalleryVertical({
  images,
  productName,
  styleProps,
  enableLightbox = false,
  primaryColor,
}: Props) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const hasMultipleImages = images.length > 1;
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
            )}
            aria-label="Enlarge image"
            aria-haspopup="dialog"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedImage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: shouldReduce ? 0 : 0.25 }}
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
              "bg-secondary relative aspect-square w-full overflow-hidden rounded-2xl",
              styleProps?.singleImageContainerClassName,
            )}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedImage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: shouldReduce ? 0 : 0.25 }}
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
                key={index}
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
                  alt={`${productName} ${index + 1}`}
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
                alt={productName}
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
