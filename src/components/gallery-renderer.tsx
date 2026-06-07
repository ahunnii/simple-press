/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { cn } from "~/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "~/components/ui/dialog";

type GalleryRendererProps = {
  gallery: {
    name?: string;
    description?: string | null;
    layout: string;
    columns: number;
    gap: number;
    showCaptions: boolean;
    enableLightbox: boolean;
    aspectRatio?: string | null;
    captionStyle?: string | null;
    images: Array<{
      id: string;
      url: string;
      altText?: string | null;
      caption?: string | null;
    }>;
  };
  showTitle?: boolean;
  showDescription?: boolean;
  titleClassName?: string;
  descriptionClassName?: string;
};

/** Maps a stored aspect ratio string to a Tailwind aspect class. */
function aspectClass(ratio: string | null | undefined): string {
  switch (ratio) {
    case "4:3":
      return "aspect-[4/3]";
    case "16:9":
      return "aspect-video";
    case "3:4":
      return "aspect-[3/4]";
    case "original":
      return "aspect-auto";
    case "1:1":
    default:
      return "aspect-square";
  }
}

/**
 * Renders a caption for an image according to the caption style.
 *
 * - overlay: always-visible dark bar at the bottom (absolutely positioned)
 * - hover:   same bar, but fades in on hover
 * - below:   returned as a separate element — caller is responsible for
 *            rendering it outside the overflow-hidden image wrapper
 *
 * When style is "below" this returns null (caller handles it separately).
 */
function OverlayCaption({
  caption,
  style,
}: {
  caption: string | null | undefined;
  style: string;
}) {
  if (!caption) return null;

  if (style === "hover") {
    return (
      <div className="pointer-events-none absolute right-0 bottom-0 left-0 bg-black/70 p-2 text-sm text-white opacity-0 transition-opacity group-hover:opacity-100">
        {caption}
      </div>
    );
  }

  // overlay (default)
  return (
    <div className="absolute right-0 bottom-0 left-0 bg-black/70 p-2 text-sm text-white">
      {caption}
    </div>
  );
}

export function GalleryRenderer({
  gallery,
  showTitle = false,
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
        return (
          <CarouselLayout gallery={gallery} onImageClick={handleImageClick} />
        );
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
              {gallery.images[lightboxIndex]!.altText ??
                gallery.images[lightboxIndex]!.caption ??
                gallery.name ??
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
  const captionStyle = gallery.captionStyle ?? "overlay";
  const isBelow = captionStyle === "below";
  const ratio = aspectClass(gallery.aspectRatio);

  return (
    <div
      className={cn(
        "grid",
        // Example: 1 col mobile, 2 col sm, etc. You can adjust these breakpoints as needed
        gallery.columns >= 4
          ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          : gallery.columns === 3
            ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
            : gallery.columns === 2
              ? "grid-cols-1 sm:grid-cols-2"
              : "grid-cols-1",
      )}
      style={{
        gap: `${gallery.gap}px`,
      }}
    >
      {gallery.images.map((image, index: number) => (
        // When captionStyle is "below" we wrap image + caption in a flex column.
        // The rounded/overflow-hidden lives only on the inner image wrapper so
        // the below-caption text isn't clipped.
        <div
          key={image.id}
          className={cn(isBelow ? "flex cursor-pointer flex-col" : "", "group")}
          onClick={isBelow ? () => onImageClick(index) : undefined}
        >
          {/* Image wrapper — always rounded + overflow-hidden */}
          <div
            className={`relative cursor-pointer overflow-hidden rounded-lg transition-transform duration-200 group-hover:scale-105 ${ratio}`}
            onClick={!isBelow ? () => onImageClick(index) : undefined}
          >
            <img
              src={image.url}
              alt={image.altText ?? ""}
              className="h-full w-full rounded-lg object-cover"
            />
            {gallery.showCaptions && !isBelow && (
              <OverlayCaption caption={image.caption} style={captionStyle} />
            )}
          </div>
          {/* Below-image caption */}
          {gallery.showCaptions && isBelow && image.caption && (
            <p className="mt-1 text-sm text-gray-700">{image.caption}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// Masonry Layout
function MasonryLayout({ gallery, onImageClick }: LayoutProps) {
  const captionStyle = gallery.captionStyle ?? "overlay";
  const isBelow = captionStyle === "below";

  return (
    <div
      style={{
        columnCount: gallery.columns,
        columnGap: `${gallery.gap}px`,
      }}
    >
      {gallery.images.map((image, index: number) => (
        <div
          key={image.id}
          className="group cursor-pointer break-inside-avoid"
          style={{ marginBottom: `${gallery.gap}px` }}
          onClick={() => onImageClick(index)}
        >
          {/* Inner wrapper clips the hover-scale; radius on the img itself
              fixes the composited-layer rounded-corner bug in Chrome/Safari */}
          <div className="relative overflow-hidden rounded-lg">
            <img
              src={image.url}
              alt={image.altText ?? ""}
              className="h-auto w-full rounded-[inherit] transition-transform group-hover:scale-110"
            />
            {gallery.showCaptions && !isBelow && (
              <OverlayCaption caption={image.caption} style={captionStyle} />
            )}
          </div>
          {gallery.showCaptions && isBelow && image.caption && (
            <p className="mt-1 text-sm text-gray-700">{image.caption}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// Carousel Layout
function CarouselLayout({
  gallery,
  onImageClick,
}: {
  gallery: LayoutProps["gallery"];
  onImageClick: (index: number) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const next = () =>
    setCurrentIndex((currentIndex + 1) % gallery.images.length);
  const prev = () =>
    setCurrentIndex(
      (currentIndex - 1 + gallery.images.length) % gallery.images.length,
    );

  const currentImage = gallery.images[currentIndex]!;

  return (
    <div className="relative">
      <div
        className={`aspect-video overflow-hidden rounded-lg ${
          gallery.enableLightbox ? "cursor-pointer" : ""
        }`}
        onClick={() => gallery.enableLightbox && onImageClick(currentIndex)}
      >
        <img
          src={currentImage.url}
          alt={currentImage.altText ?? ""}
          className="h-full w-full object-cover transition-transform duration-300"
        />
      </div>

      {/* Carousel caption always renders below the image */}
      {gallery.showCaptions && currentImage.caption && (
        <div className="mt-2 text-center text-sm text-gray-700">
          {currentImage.caption}
        </div>
      )}

      {gallery.images.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute top-1/2 left-4 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
          >
            ←
          </button>
          <button
            onClick={next}
            className="absolute top-1/2 right-4 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
          >
            →
          </button>

          <div className="mt-4 flex justify-center gap-2">
            {gallery.images.map((_, index: number) => (
              <button
                key={index}
                title={`Go to image ${index + 1}`}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 w-2 rounded-full transition-colors ${
                  index === currentIndex ? "bg-gray-900" : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Collage Layout — first image spans 2 cols × 2 rows, rest fill in
function CollageLayout({ gallery, onImageClick }: LayoutProps) {
  const gap = gallery.gap;
  const captionStyle = gallery.captionStyle ?? "overlay";
  const isBelow = captionStyle === "below";

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: `${gap}px`,
      }}
    >
      {gallery.images.map((image, index: number) => (
        <div
          key={image.id}
          className={isBelow ? "flex cursor-pointer flex-col" : ""}
          style={
            index === 0
              ? { gridColumn: "span 2", gridRow: "span 2" }
              : undefined
          }
          onClick={isBelow ? () => onImageClick(index) : undefined}
        >
          {/* radius on the img itself fixes the composited-layer rounded-corner bug */}
          <div
            className="group relative cursor-pointer overflow-hidden rounded-lg"
            style={
              index === 0
                ? { aspectRatio: "1", height: "100%" }
                : { aspectRatio: "1/1" }
            }
            onClick={!isBelow ? () => onImageClick(index) : undefined}
          >
            <img
              src={image.url}
              alt={image.altText ?? ""}
              className="h-full w-full rounded-[inherit] object-cover transition-transform group-hover:scale-110"
            />
            {gallery.showCaptions && !isBelow && (
              <OverlayCaption caption={image.caption} style={captionStyle} />
            )}
          </div>
          {gallery.showCaptions && isBelow && image.caption && (
            <p className="mt-1 text-sm text-gray-700">{image.caption}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// Justified Layout — flex rows where images share a fixed height and fill the row
function JustifiedLayout({ gallery, onImageClick }: LayoutProps) {
  const rowHeight = 220;
  const gap = gallery.gap;
  const captionStyle = gallery.captionStyle ?? "overlay";
  const isBelow = captionStyle === "below";

  return (
    <div className="flex flex-wrap" style={{ gap: `${gap}px` }}>
      {gallery.images.map((image, index: number) => (
        <div
          key={image.id}
          className={isBelow ? "flex cursor-pointer flex-col" : ""}
          style={
            isBelow
              ? { flexGrow: 1, minWidth: "150px" }
              : { height: `${rowHeight}px`, flexGrow: 1, minWidth: "150px" }
          }
          onClick={isBelow ? () => onImageClick(index) : undefined}
        >
          {/* radius on the img itself fixes the composited-layer rounded-corner bug */}
          <div
            className="group relative cursor-pointer overflow-hidden rounded-lg"
            style={
              isBelow
                ? { height: `${rowHeight}px` }
                : { height: "100%", width: "100%" }
            }
            onClick={!isBelow ? () => onImageClick(index) : undefined}
          >
            <img
              src={image.url}
              alt={image.altText ?? ""}
              className="h-full w-full rounded-[inherit] object-cover transition-transform group-hover:scale-110"
            />
            {gallery.showCaptions && !isBelow && (
              <OverlayCaption caption={image.caption} style={captionStyle} />
            )}
          </div>
          {gallery.showCaptions && isBelow && image.caption && (
            <p className="mt-1 text-sm text-gray-700">{image.caption}</p>
          )}
        </div>
      ))}
    </div>
  );
}
