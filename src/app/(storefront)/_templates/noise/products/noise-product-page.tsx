"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import type { DefaultProductPageTemplateProps } from "../../types";
import type { Product } from "~/types";
import { useVariantImage } from "~/app/(storefront)/_components/product-page/variant-image-context";
import { parseCardAdditionalFields } from "~/lib/products";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useReducedMotion } from "~/hooks/use-reduced-motion";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";
import { ProductDetailsAdditionalInfoTabs } from "~/app/(storefront)/_components/product-page/additional-info-tabs";

import { NoiseProductCard } from "../shared/noise-product-card";
import { NoiseProductActions } from "./noise-product-actions";

export function NoiseProductPage({
  product,
  business,
}: DefaultProductPageTemplateProps) {
  const { data: relatedProducts } = api.product.getRelated.useQuery({
    productId: product.id,
  });

  const [activeImg, setActiveImg] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const lightboxCloseRef = useRef<HTMLButtonElement>(null);

  const { variantImageUrl } = useVariantImage();
  // Jump to the variant's image when the selected variant changes.
  // Depend only on variantImageUrl so manual thumbnail clicks are not overridden.
  useEffect(() => {
    if (!variantImageUrl) return;
    const idx = product.images.findIndex((img) => img.url === variantImageUrl);
    if (idx >= 0) setActiveImg(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantImageUrl]);
  const enlargeTriggerRef = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();

  // C-2: Escape key for lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxOpen(false);
      } else if (e.key === "Tab") {
        // Trap focus on the single close button
        e.preventDefault();
        lightboxCloseRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen]);

  // C-2: Focus close button on open; return focus to trigger on close
  useEffect(() => {
    if (lightboxOpen) {
      const id = setTimeout(() => lightboxCloseRef.current?.focus(), 0);
      return () => clearTimeout(id);
    } else {
      enlargeTriggerRef.current?.focus();
    }
  }, [lightboxOpen]);

  // Reset active image when product changes
  useEffect(() => {
    setActiveImg(0);
    window.scrollTo(0, 0);
  }, [product.slug]);

  const additional = parseCardAdditionalFields(product.additionalFields);

  /* Derive first collection for breadcrumb + eyebrow */
  type CollectionRef = {
    collection: { id: string; name: string; slug: string } | null;
  };
  const colProds = (
    product as unknown as { collectionProducts?: CollectionRef[] }
  ).collectionProducts;
  const firstCollection = colProds?.[0]?.collection ?? null;

  /* Simple in-stock check for the status indicator */
  const inStock =
    !product.trackInventory ||
    (product.inventoryQty ?? 0) > 0 ||
    product.allowBackorders;

  const images = product.images.length > 0 ? product.images : [];
  const activeImage = images[activeImg];

  return (
    <PageTransition>
      {/* ── Breadcrumb ── */}
      <div
        className="flex items-center justify-between px-7 py-3.5"
        style={{
          background: "var(--vn-paper)",
          borderBottom: "1px solid var(--vn-line-soft) ",
        }}
      >
        <nav aria-label="Breadcrumb">
          <ol
            className="flex items-center gap-2 font-mono text-[10.5px] tracking-[0.2em] uppercase"
            style={{ listStyle: "none", margin: 0, padding: 0 }}
          >
            <li>
              <Link
                href="/"
                className="transition-opacity hover:opacity-60"
                style={{ color: "var(--vn-steel-mist)" }}
              >
                Home
              </Link>
            </li>
            <li aria-hidden="true" style={{ color: "var(--vn-rule)" }}>
              /
            </li>
            <li>
              <Link
                href="/shop"
                className="transition-opacity hover:opacity-60"
                style={{ color: "var(--vn-steel-mist)" }}
              >
                Shop
              </Link>
            </li>
            {firstCollection && (
              <>
                <li aria-hidden="true" style={{ color: "var(--vn-rule)" }}>
                  /
                </li>
                <li>
                  <Link
                    href={`/collections/${firstCollection.slug}`}
                    className="transition-opacity hover:opacity-60"
                    style={{ color: "var(--vn-steel-mist)" }}
                  >
                    {firstCollection.name}
                  </Link>
                </li>
              </>
            )}
            <li aria-hidden="true" style={{ color: "var(--vn-rule)" }}>
              /
            </li>
            <li>
              <span
                className="max-w-[30ch] truncate"
                style={{ color: "var(--vn-ink)" }}
                aria-current="page"
              >
                {product.name}
              </span>
            </li>
          </ol>
        </nav>
        {product.sku && (
          <span
            className="ml-4 hidden flex-shrink-0 font-mono text-[10px] tracking-[0.16em] uppercase md:block"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            SKU · {product.sku}
          </span>
        )}
      </div>

      {/* ── Main layout: 3 columns on desktop ── */}
      <section
        className="px-5 py-6 sm:px-7 sm:py-8"
        style={{ background: "var(--vn-paper)" }}
      >
        <div
          className="vn-product-grid mx-auto"
          style={{
            maxWidth: "1280px",
            display: "grid",
            gap: "28px",
            alignItems: "flex-start",
          }}
        >
          {/* ── Col 1: Vertical thumbnail strip ── */}
          <div
            role="group"
            aria-label="Product image thumbnails"
            className="hidden flex-col gap-2.5 md:flex"
          >
            {images.slice(0, 4).map((img, i) => (
              <button
                key={img.id}
                onClick={() => setActiveImg(i)}
                aria-label={`View image ${i + 1}`}
                aria-pressed={activeImg === i}
                className="relative overflow-hidden transition-all"
                style={{
                  aspectRatio: "4 / 5",
                  background: "var(--vn-steel)",
                  border:
                    activeImg === i
                      ? "1px solid var(--vn-ink)"
                      : "1px solid var(--vn-rule)",
                  outline:
                    activeImg === i ? "2px solid var(--vn-bone)" : "none",
                  outlineOffset: "-4px",
                }}
              >
                <Image
                  src={img.url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="80px"
                />
                <div
                  className="absolute top-1 left-1 px-1 font-mono text-[8px] tracking-[0.12em]"
                  style={{
                    background: "var(--vn-bone)",
                    color: "var(--vn-ink)",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
              </button>
            ))}
            {/* Placeholder thumbs when fewer than 4 images */}
            {images.length === 0 &&
              [0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="relative overflow-hidden"
                  style={{
                    aspectRatio: "4 / 5",
                    background:
                      i === 0 ? "var(--vn-steel)" : "var(--vn-steel-deep)",
                    border:
                      i === 0
                        ? "1px solid var(--vn-ink)"
                        : "1px solid var(--vn-rule)",
                    opacity: 0.4,
                  }}
                />
              ))}
          </div>

          {/* ── Col 2: Main image ── */}
          <div
            className="border-foreground relative overflow-hidden border"
            style={{ aspectRatio: "4 / 5", background: "var(--vn-steel)" }}
          >
            {activeImage ? (
              <button
                ref={enlargeTriggerRef}
                type="button"
                onClick={() => setLightboxOpen(true)}
                className={cn("cursor-zoom-in")}
                aria-label="Enlarge image"
              >
                <Image
                  src={activeImage.url}
                  alt={product.name ?? "Product image"}
                  fill
                  className="object-cover transition-opacity duration-300"
                  priority
                  sizes="(max-width: 768px) 100vw, 45vw"
                />
              </button>
            ) : (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  background: `repeating-linear-gradient(135deg, rgba(255,255,255,.06) 0 12px, transparent 12px 24px), linear-gradient(180deg, var(--vn-steel-deep), var(--vn-steel))`,
                }}
              >
                <span
                  className="font-serif italic select-none"
                  style={{
                    fontSize: "80px",
                    color: "var(--vn-bone)",
                    opacity: 0.12,
                  }}
                >
                  VN
                </span>
              </div>
            )}
          </div>

          {/* Mobile: horizontal thumbnail strip (between image and details) */}
          {images.length > 1 && (
            <div
              role="group"
              aria-label="Product image thumbnails"
              className="grid grid-cols-4 gap-2 md:hidden"
            >
              {images.slice(0, 4).map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImg(i)}
                  aria-label={`View image ${i + 1}`}
                  aria-pressed={activeImg === i}
                  className="relative overflow-hidden transition-all"
                  style={{
                    aspectRatio: "4 / 5",
                    background: "var(--vn-steel)",
                    border:
                      activeImg === i
                        ? "1px solid var(--vn-ink)"
                        : "1px solid var(--vn-rule)",
                    outline:
                      activeImg === i ? "2px solid var(--vn-bone)" : "none",
                    outlineOffset: "-4px",
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

          {/* ── Col 3: Detail panel ── */}
          <FadeIn
            delay={0.12}
            className="flex flex-col gap-6"
            style={{ paddingLeft: "20px" }}
          >
            {/* Category eyebrow */}
            {firstCollection && (
              <span
                className="font-mono text-[11px] tracking-[0.22em] uppercase"
                style={{ color: "var(--vn-steel-mist)" }}
              >
                {firstCollection.name}
              </span>
            )}

            {/* Product name */}
            <h1
              className="font-serif leading-[1.0] tracking-tight italic"
              style={{
                fontSize: "clamp(2rem, 4vw, 3.2rem)",
                letterSpacing: "-0.02em",
              }}
            >
              {product.name}
            </h1>

            {/* Description */}
            {product.description && (
              <p
                className="max-w-[44ch] font-sans leading-[1.85] whitespace-pre-line"
                style={{ fontSize: "14px", color: "var(--vn-ink-soft)" }}
              >
                {product.description}
              </p>
            )}

            {/* Tagline badge */}
            {additional?.productTagline && (
              <span className="vn-stamp self-start text-[10px]">
                {additional.productTagline}
              </span>
            )}

            {/* Variant + add to cart + trust badges */}
            <NoiseProductActions product={product} business={business} />
          </FadeIn>
        </div>
      </section>

      {/* ── Description tabs / accordion ── */}
      <section
        className="border-foreground/20 border-t border-b px-7"
        style={{ background: "var(--vn-paper)" }}
      >
        <ProductDetailsAdditionalInfoTabs
          product={product}
          includeCard={false}
          styleProps={{
            tabsTriggerClassName:
              "font-mono text-[10px] tracking-[0.25em] uppercase rounded-none",
            tipTapRendererClassName:
              "pt-8 pb-8 font-sans text-[14px] leading-[1.85] text-muted-foreground ",
            contentClassName:
              "pt-8 pb-8 font-sans text-[14px] leading-[1.85] text-muted-foreground",
          }}
        />
      </section>

      {/* ── Related products ── */}
      {relatedProducts && relatedProducts.length > 0 && (
        <section className="px-7 py-16">
          <div className="mx-auto max-w-[1440px]">
            <FadeIn
              className="mb-10 flex items-end justify-between pb-6"
              style={{ borderColor: "var(--vn-rule)" }}
            >
              <div>
                <p
                  className="mb-3 font-mono text-[9.5px] tracking-[0.28em] uppercase"
                  style={{ color: "var(--vn-steel-mist)" }}
                >
                  You may also like
                </p>
                <h2
                  className="font-serif leading-none tracking-tight italic"
                  style={{
                    fontSize: "clamp(2rem, 4vw, 3rem)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  More from the collection.
                </h2>
              </div>
              <Link
                href="/shop"
                className="flex shrink-0 items-center gap-3 px-3.5 py-2 font-mono text-[10px] tracking-[.22em] uppercase transition-opacity hover:opacity-60"
                style={{
                  border: "1px solid var(--vn-ink)",
                  color: "var(--vn-ink)",
                }}
              >
                View all →
              </Link>
            </FadeIn>

            <StaggerContainer
              className="grid grid-cols-2 gap-5 lg:grid-cols-4"
              staggerDelay={0.08}
            >
              {relatedProducts.slice(0, 4).map((p, index) => (
                <StaggerItem key={p.id}>
                  <NoiseProductCard product={p as Product} index={index} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>
      )}

      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${product.name ?? "Product"} image, enlarged view`}
            initial={{ opacity: reduce ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: reduce ? 1 : 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => setLightboxOpen(false)}
          >
            <motion.div
              initial={{ scale: reduce ? 1 : 0.92, opacity: reduce ? 1 : 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: reduce ? 1 : 0.92, opacity: reduce ? 1 : 0 }}
              transition={{ duration: reduce ? 0 : 0.2 }}
              className="relative max-h-[90vh] max-w-[90vw]"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={images[activeImg]?.url ?? "/placeholder.svg"}
                alt={product.name ?? "Product image"}
                width={1200}
                height={1200}
                className="max-h-[90vh] max-w-[90vw] rounded-none object-contain"
              />
              <button
                ref={lightboxCloseRef}
                type="button"
                onClick={() => setLightboxOpen(false)}
                aria-label="Close image viewer"
                className="bg-background/80 hover:bg-background absolute top-3 right-3 rounded-full p-2.5 backdrop-blur-sm transition-colors"
              >
                <X className="size-5" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
