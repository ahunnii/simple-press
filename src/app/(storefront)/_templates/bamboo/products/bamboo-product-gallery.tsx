"use client";

import type { CSSProperties, KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import { cn } from "~/lib/utils";
import { useVariantImage } from "~/app/(storefront)/_components/product-page/variant-image-context";

import { BambooGlyph } from "../shared/bamboo-glyph";
import { BambooReveal } from "../shared/bamboo-reveal";

type GalleryImage = { url: string };

type Props = {
  images: GalleryImage[];
  productName: string;
};

/**
 * Product gallery — the mockup's `.gal-frame`/`.gal-blob`/`.gal-badge`/
 * `.thumbs` composition (mockup-b-product.elided.html lines ~511-560),
 * rebuilt on the existing `.bamboo-card-photo`/`.bamboo-photo-badge`/
 * `.bamboo-blob` classes rather than new ones. `.bamboo-card-photo` carries
 * a built-in -3deg tilt (right for a small card); the mockup's main gallery
 * frame is NOT tilted, so it's cancelled here with an inline
 * `transform: "none"` (inline style always wins over the stylesheet rule).
 *
 * Stays in sync with the variant selector via `useVariantImage()` — same
 * mechanism as the shared `ProductGalleryHorizontal` this replaces for
 * bamboo. Thumbnails are normally tabbable (not a strict roving-tabindex
 * pattern — the mockup doesn't use one either); ArrowRight/Down and
 * ArrowLeft/Up additionally move both selection and focus to the
 * next/previous thumbnail, wrapping around (mockup script, same file,
 * `thumbs.forEach(...keydown...)`).
 *
 * `BambooReveal` wraps the frame and the thumbnail row individually (mockup:
 * `.gal-wrap.reveal` / `.thumbs.reveal`), never the outer `lg:sticky`
 * container — `.bamboo-reveal`'s pre-reveal `transform: translateY(24px)`
 * would otherwise sit on an ANCESTOR of the sticky element and can disrupt
 * `position: sticky`'s containing-block math (a transformed ancestor changes
 * what a sticky descendant sticks to). The mockup itself nests `reveal`
 * inside `.gal` for the same reason.
 */
export function BambooProductGallery({ images, productName }: Props) {
  const [selected, setSelected] = useState(0);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const hasMultiple = images.length > 1;

  const { variantImageUrl } = useVariantImage();
  useEffect(() => {
    if (!variantImageUrl) return;
    const idx = images.findIndex((img) => img.url === variantImageUrl);
    if (idx >= 0) setSelected(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantImageUrl]);

  function handleThumbKeyDown(
    e: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      next = (index + 1) % images.length;
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      next = (index - 1 + images.length) % images.length;
    }
    if (next === -1) return;
    e.preventDefault();
    setSelected(next);
    thumbRefs.current[next]?.focus();
  }

  return (
    <div className="lg:sticky lg:top-[104px]">
      <BambooReveal className="relative">
        <span
          aria-hidden="true"
          className="bamboo-blob absolute top-[11%] -left-[9%] z-0 h-[86%] w-[66%]"
          style={{ "--br": "-11deg" } as CSSProperties}
        />
        <div
          className="bamboo-card-photo relative z-1"
          style={{ "--aw": "100%", transform: "none" } as CSSProperties}
        >
          <div className="relative aspect-[1200/1011] overflow-hidden rounded-lg bg-[var(--bamboo-cream)]">
            {images.length > 0 ? (
              images.map((img, i) => (
                <div
                  key={`${img.url}-${i}`}
                  aria-hidden={i !== selected}
                  className={cn(
                    "absolute inset-0 transition-opacity duration-300",
                    i === selected
                      ? "opacity-100"
                      : "pointer-events-none opacity-0",
                  )}
                >
                  <Image
                    src={img.url}
                    alt={i === selected ? productName : ""}
                    fill
                    priority={i === 0}
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
              ))
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Image
                  src="/placeholder.svg"
                  alt={productName}
                  width={280}
                  height={236}
                  className="h-[60%] w-auto object-contain opacity-70"
                />
              </div>
            )}
          </div>
          <span className="bamboo-photo-badge" aria-hidden="true">
            <BambooGlyph id="s-wreath" />
          </span>
        </div>
      </BambooReveal>

      {hasMultiple ? (
        <BambooReveal style={{ "--rd": "90ms" } as CSSProperties}>
          <div
            role="group"
            aria-label="Product images"
            className="mt-[18px] grid grid-cols-3 gap-3"
          >
            {images.map((img, i) => (
              <button
                key={`${img.url}-${i}`}
                ref={(el) => {
                  thumbRefs.current[i] = el;
                }}
                type="button"
                aria-pressed={i === selected}
                aria-label={`Show product image ${i + 1} of ${images.length}`}
                onClick={() => setSelected(i)}
                onKeyDown={(e) => handleThumbKeyDown(e, i)}
                className={cn(
                  "rounded-[14px] border-2 bg-[var(--bamboo-roll)] p-[9px] transition-[border-color,transform,box-shadow] duration-300 hover:-translate-y-[3px]",
                  i === selected
                    ? "border-[var(--bamboo-pine)] shadow-[var(--bamboo-soft)]"
                    : "border-[var(--bamboo-outline)] hover:border-[var(--bamboo-sage-deep)] hover:shadow-[var(--bamboo-soft)]",
                )}
              >
                <span className="relative block aspect-square overflow-hidden rounded-lg bg-[var(--bamboo-cream)]">
                  <Image
                    src={img.url}
                    alt=""
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </span>
              </button>
            ))}
          </div>
        </BambooReveal>
      ) : null}
    </div>
  );
}
