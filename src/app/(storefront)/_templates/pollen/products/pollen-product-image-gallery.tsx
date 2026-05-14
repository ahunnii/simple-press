"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";

type Props = {
  images: { url: string }[];
  productName: string;
};

export function PollenProductImageGallery({ images, productName }: Props) {
  const [selectedImage, setSelectedImage] = useState(0);
  const hasMultipleImages = images.length > 1;

  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse">
      {/* Main Image */}
      <div className="relative aspect-square min-w-0 flex-1 overflow-hidden rounded-md bg-[#f5f2ee]">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedImage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
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

      {/* Thumbnail Strip */}
      {hasMultipleImages && (
        <div className="flex flex-row gap-2 lg:flex-col">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setSelectedImage(i)}
              aria-label={`View image ${i + 1}`}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-sm border transition-all duration-200 ${
                selectedImage === i
                  ? "border-[#215935] opacity-100"
                  : "border-[#2a351f]/20 opacity-50 hover:opacity-80"
              }`}
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
  );
}
