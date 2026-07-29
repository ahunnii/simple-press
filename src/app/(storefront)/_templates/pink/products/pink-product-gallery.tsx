"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

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
 */
export function PinkProductGallery({ images, productName, badge }: Props) {
  const [active, setActive] = useState(0);
  const { variantImageUrl } = useVariantImage();

  useEffect(() => {
    if (!variantImageUrl) return;
    const idx = images.findIndex((img) => img.url === variantImageUrl);
    if (idx >= 0) setActive(idx);
  }, [variantImageUrl, images]);

  const list = images.length > 0 ? images : [{ id: "placeholder", url: "/placeholder.svg", altText: productName }];
  // The thumbnail column only renders for multi-image products. Keeping the
  // `74px _ 1fr` track list in the single-image case put the MAIN frame in the
  // 74px column — a thumbnail-sized hero beside an empty half-page.
  const hasThumbs = list.length > 1;

  return (
    <div
      className={`grid gap-3 sm:sticky sm:top-[var(--pink-sticky-top)] sm:items-start sm:self-start${
        hasThumbs ? " sm:grid-cols-[74px_minmax(0,1fr)]" : ""
      }`}
    >
      {/* ── Vertical thumbnail column (desktop) ── */}
      {list.length > 1 && (
        <div role="group" aria-label="Product image thumbnails" className="hidden flex-col gap-2.5 sm:flex">
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
                border: active === i ? "1px solid var(--pink-rose)" : "1px solid var(--pink-line)",
              }}
            >
              <Image src={img.url} alt="" fill className="object-cover" sizes="74px" />
            </button>
          ))}
        </div>
      )}

      {/* ── Main frame — cross-fades between views ── */}
      <div className="relative overflow-hidden" style={{ aspectRatio: "4 / 5", background: "var(--pink-panel)" }}>
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
      </div>

      {/* ── Horizontal thumbnail strip (mobile) ── */}
      {list.length > 1 && (
        <div role="group" aria-label="Product image thumbnails" className="grid grid-cols-4 gap-2 sm:hidden">
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
                border: active === i ? "1px solid var(--pink-rose)" : "1px solid var(--pink-line)",
              }}
            >
              <Image src={img.url} alt="" fill className="object-cover" sizes="25vw" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
