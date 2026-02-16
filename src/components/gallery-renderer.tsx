"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "~/components/ui/dialog";

type GalleryRendererProps = {
  gallery: {
    name?: string; // ADD THIS
    description?: string | null; // ADD THIS
    layout: string;
    columns: number;
    gap: number;
    showCaptions: boolean;
    enableLightbox: boolean;
    images: Array<{
      id: string;
      url: string;
      altText?: string | null;
      caption?: string | null;
    }>;
  };
  showTitle?: boolean; // ADD THIS - control title display
  showDescription?: boolean; // ADD THIS - control description display
  titleClassName?: string; // ADD THIS - custom title styling
  descriptionClassName?: string; // ADD THIS - custom description styling
};

export function GalleryRenderer({
  gallery,
  showTitle = false, // Default false for backward compatibility
  showDescription = false,
  titleClassName = "text-3xl font-bold mb-2",
  descriptionClassName = "text-gray-600 mb-8",
}: GalleryRendererProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const handleImageClick = (index: number) => {
    if (gallery.enableLightbox) {
      setLightboxIndex(index);
    }
  };

  const closeLightbox = () => setLightboxIndex(null);

  const nextImage = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % gallery.images.length);
    }
  };

  const prevImage = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex(
        (lightboxIndex - 1 + gallery.images.length) % gallery.images.length,
      );
    }
  };

  const renderGallery = () => {
    switch (gallery.layout) {
      case "grid":
        return <GridLayout gallery={gallery} onImageClick={handleImageClick} />;
      case "masonry":
        return (
          <MasonryLayout gallery={gallery} onImageClick={handleImageClick} />
        );
      case "carousel":
        return <CarouselLayout gallery={gallery} />;
      case "collage":
        return (
          <CollageLayout gallery={gallery} onImageClick={handleImageClick} />
        );
      case "justified":
        return (
          <JustifiedLayout gallery={gallery} onImageClick={handleImageClick} />
        );
      default:
        return <GridLayout gallery={gallery} onImageClick={handleImageClick} />;
    }
  };

  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "ArrowLeft") prevImage();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex]);

  return (
    <div className="gallery-container">
      {/* Title & Description */}
      {(showTitle || showDescription) && (
        <div className="gallery-header mb-6">
          {showTitle && gallery?.name && (
            <h2 className={titleClassName}>{gallery?.name}</h2>
          )}
          {showDescription && gallery?.description && (
            <p className={descriptionClassName}>{gallery?.description}</p>
          )}
        </div>
      )}

      {renderGallery()}

      {/* Lightbox */}
      {gallery.enableLightbox && lightboxIndex !== null && (
        <Dialog open={true} onOpenChange={closeLightbox}>
          <DialogContent className="max-w-7xl p-0">
            <DialogTitle className="sr-only">
              {gallery.images[lightboxIndex]!.altText ||
                gallery.images[lightboxIndex]!.caption ||
                gallery.name ||
                "Image lightbox"}
            </DialogTitle>
            <div className="relative">
              <img
                src={gallery.images[lightboxIndex]!.url}
                alt={gallery.images[lightboxIndex]!.altText ?? ""}
                className="h-auto max-h-[90vh] w-full object-contain"
              />

              {gallery.showCaptions &&
                gallery.images[lightboxIndex]!.caption && (
                  <div className="absolute right-0 bottom-0 left-0 bg-black/70 p-4 text-white">
                    {gallery.images[lightboxIndex]!.caption}
                  </div>
                )}

              {/* Navigation */}
              <button
                onClick={prevImage}
                className="absolute top-1/2 left-4 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
              >
                ←
              </button>
              <button
                onClick={nextImage}
                className="absolute top-1/2 right-4 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
              >
                →
              </button>

              <button
                title="Close lightbox"
                onClick={closeLightbox}
                className="absolute top-4 right-4 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

type LayoutProps = {
  gallery: GalleryRendererProps["gallery"];
  onImageClick: (index: number) => void;
};
// Grid Layout
function GridLayout({ gallery, onImageClick }: LayoutProps) {
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${gallery.columns}, 1fr)`,
        gap: `${gallery.gap}px`,
      }}
    >
      {gallery.images.map((image, index: number) => (
        <div
          key={image.id}
          className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg"
          onClick={() => onImageClick(index)}
        >
          <img
            src={image.url}
            alt={image.altText ?? ""}
            className="h-full w-full object-cover transition-transform group-hover:scale-110"
          />
          {gallery.showCaptions && image.caption && (
            <div className="absolute right-0 bottom-0 left-0 bg-black/70 p-2 text-sm text-white">
              {image.caption}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Masonry Layout
function MasonryLayout({ gallery, onImageClick }: LayoutProps) {
  return (
    <div
      className="columns-1 sm:columns-2 md:columns-3 lg:columns-4"
      style={{ gap: `${gallery.gap}px` }}
    >
      {gallery.images.map((image, index: number) => (
        <div
          key={image.id}
          className="group mb-4 cursor-pointer break-inside-avoid"
          onClick={() => onImageClick(index)}
        >
          <div className="relative overflow-hidden rounded-lg">
            <img
              src={image.url}
              alt={image.altText ?? ""}
              className="h-auto w-full transition-transform group-hover:scale-110"
            />
            {gallery.showCaptions && image.caption && (
              <div className="absolute right-0 bottom-0 left-0 bg-black/70 p-2 text-sm text-white">
                {image.caption}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Carousel Layout
function CarouselLayout({ gallery }: { gallery: LayoutProps["gallery"] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const next = () =>
    setCurrentIndex((currentIndex + 1) % gallery.images.length);
  const prev = () =>
    setCurrentIndex(
      (currentIndex - 1 + gallery.images.length) % gallery.images.length,
    );

  return (
    <div className="relative">
      <div className="aspect-video overflow-hidden rounded-lg">
        <img
          src={gallery.images[currentIndex]!.url}
          alt={gallery.images[currentIndex]!.altText ?? ""}
          className="h-full w-full object-cover"
        />
      </div>

      {gallery.showCaptions && gallery.images[currentIndex]!.caption && (
        <div className="mt-2 text-center text-gray-700">
          {gallery.images[currentIndex]!.caption}
        </div>
      )}

      <button
        onClick={prev}
        className="absolute top-1/2 left-4 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white"
      >
        ←
      </button>
      <button
        onClick={next}
        className="absolute top-1/2 right-4 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white"
      >
        →
      </button>

      {/* Dots */}
      <div className="mt-4 flex justify-center gap-2">
        {gallery.images.map((_, index: number) => (
          <button
            key={index}
            title="Go to image"
            onClick={() => setCurrentIndex(index)}
            className={`h-2 w-2 rounded-full ${
              index === currentIndex ? "bg-black" : "bg-gray-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// Simplified Collage & Justified layouts
function CollageLayout({ gallery, onImageClick }: LayoutProps) {
  return (
    <GridLayout
      gallery={{ ...gallery, columns: 4 }}
      onImageClick={onImageClick}
    />
  );
}

function JustifiedLayout({ gallery, onImageClick }: LayoutProps) {
  return (
    <GridLayout
      gallery={{ ...gallery, columns: 5 }}
      onImageClick={onImageClick}
    />
  );
}
