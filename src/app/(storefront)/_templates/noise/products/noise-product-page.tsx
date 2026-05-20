"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

import type { DefaultProductPageTemplateProps } from "../../types";
import type { Product } from "~/types";
import { parseCardAdditionalFields } from "~/lib/products";
import { formatPrice } from "~/lib/prices";
import { api } from "~/trpc/react";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";
import { ProductDetailsAdditionalInfoTabs } from "~/app/(storefront)/_components/product-page/additional-info-tabs";

import { NoiseProductCard } from "../shared/noise-product-card";
import { NoiseProductActions } from "./noise-product-actions";

const TRUST_NOTES = [
  "Free returns · 60 days",
  "Carbon-neutral shipping",
  "Lifetime repair program",
] as const;

export function NoiseProductPage({ product }: DefaultProductPageTemplateProps) {
  const { data: relatedProducts } = api.product.getRelated.useQuery({
    productId: product.id,
  });

  const [activeImg, setActiveImg] = useState(0);

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
  const colProds = (product as unknown as { collectionProducts?: CollectionRef[] })
    .collectionProducts;
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
        className="flex items-center justify-between px-7 py-3.5 border-b border-foreground/20"
        style={{ background: "var(--vn-paper)" }}
      >
        <div className="font-mono text-[10.5px] tracking-[0.2em] uppercase flex items-center gap-2">
          <Link href="/" className="transition-opacity hover:opacity-60" style={{ color: "var(--vn-steel-mist)" }}>
            Home
          </Link>
          <span style={{ color: "var(--vn-rule)" }}>/</span>
          <Link href="/shop" className="transition-opacity hover:opacity-60" style={{ color: "var(--vn-steel-mist)" }}>
            Shop
          </Link>
          {firstCollection && (
            <>
              <span style={{ color: "var(--vn-rule)" }}>/</span>
              <Link
                href={`/collections/${firstCollection.slug}`}
                className="transition-opacity hover:opacity-60"
                style={{ color: "var(--vn-steel-mist)" }}
              >
                {firstCollection.name}
              </Link>
            </>
          )}
          <span style={{ color: "var(--vn-rule)" }}>/</span>
          <span className="truncate max-w-[30ch]" style={{ color: "var(--vn-ink)" }}>
            {product.name}
          </span>
        </div>
        {product.sku && (
          <span
            className="font-mono text-[10px] tracking-[0.16em] uppercase hidden md:block flex-shrink-0 ml-4"
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
          className="mx-auto"
          style={{
            maxWidth: "1280px",
            display: "grid",
            gridTemplateColumns: "80px 1fr 1fr",
            gap: "28px",
            alignItems: "flex-start",
          }}
        >
          {/* ── Col 1: Vertical thumbnail strip ── */}
          <div className="hidden md:flex flex-col gap-2.5">
            {images.slice(0, 4).map((img, i) => (
              <button
                key={img.id}
                onClick={() => setActiveImg(i)}
                className="relative overflow-hidden transition-all"
                style={{
                  aspectRatio: "4 / 5",
                  background: "var(--vn-steel)",
                  border: activeImg === i
                    ? "1px solid var(--vn-ink)"
                    : "1px solid var(--vn-rule)",
                  outline: activeImg === i ? "2px solid var(--vn-bone)" : "none",
                  outlineOffset: "-4px",
                }}
                aria-label={`View image ${i + 1}`}
              >
                <Image
                  src={img.url}
                  alt={`View ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
                <div
                  className="absolute left-1 top-1 font-mono text-[8px] tracking-[0.12em] px-1"
                  style={{ background: "var(--vn-bone)", color: "var(--vn-ink)" }}
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
                    background: i === 0 ? "var(--vn-steel)" : "var(--vn-steel-deep)",
                    border: i === 0 ? "1px solid var(--vn-ink)" : "1px solid var(--vn-rule)",
                    opacity: 0.4,
                  }}
                />
              ))}
          </div>

          {/* ── Col 2: Main image ── */}
          <div
            className="relative overflow-hidden border border-foreground"
            style={{ aspectRatio: "4 / 5", background: "var(--vn-steel)" }}
          >
            {activeImage ? (
              <Image
                src={activeImage.url}
                alt={product.name ?? "Product image"}
                fill
                className="object-cover transition-opacity duration-300"
                priority
                sizes="(max-width: 768px) 100vw, 45vw"
              />
            ) : (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  background: `repeating-linear-gradient(135deg, rgba(255,255,255,.06) 0 12px, transparent 12px 24px), linear-gradient(180deg, var(--vn-steel-deep), var(--vn-steel))`,
                }}
              >
                <span
                  className="font-serif italic select-none"
                  style={{ fontSize: "80px", color: "var(--vn-bone)", opacity: 0.12 }}
                >
                  VN
                </span>
              </div>
            )}
            {/* Figure label */}
            <div
              className="absolute left-3.5 top-3.5 font-mono text-[9.5px] tracking-[0.18em] uppercase px-2 py-1"
              style={{ background: "var(--vn-bone)", color: "var(--vn-ink)" }}
            >
              Fig. {String(activeImg + 1).padStart(2, "0")}
            </div>
            {/* Price badge */}
            <div
              className="absolute right-3.5 top-3.5 font-mono text-[9.5px] tracking-[0.18em] uppercase px-2 py-1"
              style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
            >
              {formatPrice(product.price)}
            </div>
          </div>

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
              className="font-serif italic leading-[1.0] tracking-tight"
              style={{
                fontSize: "clamp(2rem, 4vw, 3.2rem)",
                letterSpacing: "-0.02em",
              }}
            >
              {product.name}
            </h1>

            {/* Price + stock status */}
            <div className="flex items-baseline gap-4">
              <span
                className="font-serif italic leading-none"
                style={{ fontSize: "clamp(1.6rem, 2.5vw, 2.2rem)", letterSpacing: "-0.01em" }}
              >
                {formatPrice(product.price)}
              </span>
              {product.compareAtPrice && (
                <span
                  className="font-sans line-through"
                  style={{ fontSize: "16px", color: "var(--vn-steel-mist)" }}
                >
                  {formatPrice(product.compareAtPrice)}
                </span>
              )}
            </div>

            {/* Stock indicator */}
            <div
              className="flex items-center gap-2 font-sans text-[13px]"
              style={{ color: inStock ? "#3f7a4f" : "var(--vn-steel-mist)" }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: inStock ? "#3f7a4f" : "var(--vn-rule)",
                  flexShrink: 0,
                }}
              />
              {inStock
                ? product.allowBackorders && (product.inventoryQty ?? 0) <= 0
                  ? "Backordered · ships when available"
                  : "In stock · ready to ship"
                : "Out of stock"}
            </div>

            {/* Description */}
            {product.description && (
              <p
                className="font-sans leading-[1.85] max-w-[44ch]"
                style={{ fontSize: "14px", color: "var(--vn-ink-soft)" }}
              >
                {product.description}
              </p>
            )}

            {/* Tagline badge */}
            {additional?.productTagline && (
              <span className="vn-stamp text-[10px] self-start">
                {additional.productTagline}
              </span>
            )}

            {/* Variant + add to cart + trust badges */}
            <NoiseProductActions product={product} />

            {/* 3-item trust row (design's guarantee strip) */}
            <div
              className="grid grid-cols-3 gap-2 border-t pt-5"
              style={{ borderColor: "var(--vn-line-soft)" }}
            >
              {TRUST_NOTES.map((note) => (
                <div
                  key={note}
                  className="font-mono text-[10px] tracking-[0.1em] uppercase text-center py-2.5 px-1"
                  style={{
                    border: "1px solid var(--vn-line-soft)",
                    color: "var(--vn-steel-mist)",
                  }}
                >
                  {note}
                </div>
              ))}
            </div>
          </FadeIn>
        </div>

        {/* Mobile: horizontal thumbnail strip (below main image) */}
        {images.length > 1 && (
          <div
            className="md:hidden mx-auto grid grid-cols-4 gap-2 mt-4"
            style={{ maxWidth: "1280px" }}
          >
            {images.slice(0, 4).map((img, i) => (
              <button
                key={img.id}
                onClick={() => setActiveImg(i)}
                className="relative overflow-hidden"
                style={{
                  aspectRatio: "4 / 5",
                  background: "var(--vn-steel)",
                  border: activeImg === i
                    ? "1px solid var(--vn-ink)"
                    : "1px solid var(--vn-rule)",
                }}
                aria-label={`View image ${i + 1}`}
              >
                <Image
                  src={img.url}
                  alt={`View ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="25vw"
                />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ── Description tabs / accordion ── */}
      <section
        className="px-7 border-t border-b border-foreground/20"
        style={{ background: "var(--vn-paper)" }}
      >
        <ProductDetailsAdditionalInfoTabs
          product={product}
          includeCard={false}
          styleProps={{
            tabsTriggerClassName:
              "font-mono text-[10px] tracking-[0.25em] uppercase rounded-none",
            tipTapRendererClassName:
              "pt-8 pb-8 font-sans text-[14px] leading-[1.85] text-muted-foreground",
            contentClassName:
              "pt-8 pb-8 font-sans text-[14px] leading-[1.85] text-muted-foreground",
          }}
        />
      </section>

      {/* ── Related products ── */}
      {relatedProducts && relatedProducts.length > 0 && (
        <section
          className="px-7 py-16"
          style={{ background: "var(--vn-bone)" }}
        >
          <div className="mx-auto max-w-7xl">
            <FadeIn className="mb-10 flex items-end justify-between border-b pb-6" style={{ borderColor: "var(--vn-rule)" }}>
              <div>
                <p
                  className="font-mono text-[9.5px] tracking-[0.28em] uppercase mb-3"
                  style={{ color: "var(--vn-steel-mist)" }}
                >
                  You may also like
                </p>
                <h2
                  className="font-serif italic leading-none tracking-tight"
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
                className="font-mono text-[10px] tracking-[0.22em] uppercase hidden md:flex items-center gap-3 transition-opacity hover:opacity-60"
                style={{ color: "var(--vn-ink)" }}
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
    </PageTransition>
  );
}
