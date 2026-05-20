"use client";

import { useEffect } from "react";
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

export function NoiseProductPage({ product }: DefaultProductPageTemplateProps) {
  const { data: relatedProducts } = api.product.getRelated.useQuery({
    productId: product.id,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [product.slug]);

  const additional = parseCardAdditionalFields(product.additionalFields);

  /* Derive first collection for breadcrumb */
  type CollectionRef = {
    collection: { id: string; name: string; slug: string } | null;
  };
  const colProds = (product as unknown as { collectionProducts?: CollectionRef[] })
    .collectionProducts;
  const firstCollection = colProds?.[0]?.collection ?? null;

  /* Stamps: season + hand-made (coming-soon handled by actions) */
  const stamps = [
    additional?.comingSoon ? "Coming Soon" : null,
    "Hand-stitched",
    "S/S 26",
  ].filter(Boolean) as string[];

  return (
    <PageTransition>
      {/* Breadcrumb */}
      <div
        className="flex items-center justify-between px-7 py-3.5 border-b border-foreground/20"
        style={{ background: "var(--vn-paper)" }}
      >
        <div className="font-mono text-[10.5px] tracking-[0.2em] uppercase flex items-center">
          <Link
            href="/"
            className="transition-colors hover:opacity-60"
            style={{ color: "var(--vn-steel)" }}
          >
            Index
          </Link>
          <span className="mx-2" style={{ color: "var(--vn-rule)" }}>
            /
          </span>
          <Link
            href="/shop"
            className="transition-colors hover:opacity-60"
            style={{ color: "var(--vn-steel)" }}
          >
            Shop
          </Link>
          {firstCollection && (
            <>
              <span className="mx-2" style={{ color: "var(--vn-rule)" }}>
                /
              </span>
              <Link
                href={`/collections/${firstCollection.slug}`}
                className="transition-colors hover:opacity-60"
                style={{ color: "var(--vn-steel)" }}
              >
                {firstCollection.name}
              </Link>
            </>
          )}
          <span className="mx-2" style={{ color: "var(--vn-rule)" }}>
            /
          </span>
          <span style={{ color: "var(--vn-ink)" }}>{product.name}</span>
        </div>
        {product.sku && (
          <span
            className="font-mono text-[10px] tracking-[0.16em] uppercase hidden md:block"
            style={{ color: "var(--vn-steel)" }}
          >
            SKU · {product.sku}
          </span>
        )}
      </div>

      {/* Main two-column layout */}
      <section
        className="grid border-b-2 border-foreground grid-cols-1 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]"
        style={{ background: "var(--vn-paper)" }}
      >
        {/* LEFT — Gallery */}
        <FadeIn direction="left" className="border-b border-foreground md:border-b-0 md:border-r p-7">
          {/* Hero shot */}
          <div
            className="relative border border-foreground overflow-hidden"
            style={{ aspectRatio: "3/4", background: "var(--vn-steel)" }}
          >
            {product.images[0] ? (
              <Image
                src={product.images[0].url}
                alt={product.name ?? "Product image"}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 55vw"
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
                  style={{
                    fontSize: "80px",
                    color: "var(--vn-bone)",
                    opacity: 0.15,
                  }}
                >
                  VN
                </span>
              </div>
            )}
            {/* Figure label */}
            <div
              className="absolute left-3.5 top-3.5 font-mono text-[10px] tracking-[0.18em] uppercase px-2 py-1"
              style={{ background: "var(--vn-bone)", color: "var(--vn-ink)" }}
            >
              Fig. 01 · Front
            </div>
            {/* Base price badge — shows product price, not variant */}
            <div
              className="absolute right-3.5 top-3.5 font-mono text-[10px] tracking-[0.18em] uppercase px-2 py-1"
              style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
            >
              {formatPrice(product.price)}
            </div>
          </div>

          {/* Thumbnail strip */}
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-3 mt-3.5">
              {product.images.slice(0, 4).map((img, i) => (
                <div
                  key={img.id}
                  className="relative border border-foreground overflow-hidden cursor-pointer"
                  style={{ aspectRatio: "3/4", background: "var(--vn-steel)" }}
                >
                  <Image
                    src={img.url}
                    alt={`View ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="15vw"
                  />
                  <div
                    className="absolute left-1.5 top-1.5 font-mono text-[9px] tracking-[0.16em] px-1"
                    style={{
                      background: "var(--vn-bone)",
                      color: "var(--vn-ink)",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </FadeIn>

        {/* RIGHT — Detail panel */}
        <FadeIn
          direction="right"
          delay={0.15}
          className="flex flex-col gap-6 p-9"
          style={{ background: "var(--vn-paper)" }}
        >
          {/* Stamps row */}
          <div className="flex flex-wrap gap-1.5">
            {stamps.map((s) => (
              <span key={s} className="vn-stamp text-[10px]">
                {s}
              </span>
            ))}
          </div>

          {/* H1 with category eyebrow */}
          <div>
            {firstCollection && (
              <span
                className="font-mono text-[11px] tracking-[0.22em] uppercase block mb-2.5"
                style={{ color: "var(--vn-steel)" }}
              >
                {firstCollection.name} / N° 01
              </span>
            )}
            <h1
              className="font-serif italic leading-[1.0] tracking-tight"
              style={{
                fontSize: "clamp(2.8rem, 5.2vw, 5.25rem)",
                letterSpacing: "-0.02em",
              }}
            >
              {product.name}
              {additional?.productTagline && (
                <>
                  {" "}
                  <em style={{ color: "var(--vn-steel)" }}>
                    {additional.productTagline}
                  </em>
                </>
              )}
            </h1>
          </div>

          {/* Lede — description as italic serif */}
          {product.description && (
            <p
              className="font-serif italic leading-[1.35] max-w-[38ch]"
              style={{ fontSize: "20px", color: "var(--vn-ink-soft)" }}
            >
              {product.description}
            </p>
          )}

          {/* Price row + variant selectors + add to cart + trust badges + notes
              All in one client component so they share a single useProduct instance */}
          <NoiseProductActions product={product} />
        </FadeIn>
      </section>

      {/* Description tabs */}
      <section
        className="px-7 border-b border-foreground/20"
        style={{ background: "var(--vn-paper)" }}
      >
        <ProductDetailsAdditionalInfoTabs
          product={product}
          includeCard={false}
          styleProps={{
            tabsTriggerClassName:
              "font-mono text-[10px] tracking-[0.25em] uppercase rounded-none",
            tipTapRendererClassName:
              "pt-8 pb-8 text-muted-foreground font-sans text-base leading-relaxed",
            contentClassName:
              "pt-8 pb-8 text-muted-foreground font-sans text-base leading-relaxed",
          }}
        />
      </section>

      {/* Related products */}
      {relatedProducts && relatedProducts.length > 0 && (
        <section className="px-7 py-16" style={{ background: "var(--vn-paper)" }}>
          <div className="mx-auto max-w-7xl">
            <FadeIn className="flex items-end justify-between mb-8 border-b border-foreground/20 pb-6">
              <div>
                <p
                  className="font-mono text-[9.5px] tracking-[0.4em] uppercase mb-3"
                  style={{ color: "var(--vn-steel)" }}
                >
                  You might also like
                </p>
                <h2
                  className="font-serif italic leading-none tracking-tight"
                  style={{
                    fontSize: "clamp(2.5rem, 5vw, 4rem)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  More from the collection.
                </h2>
              </div>
              <Link
                href="/shop"
                className="font-mono text-[10px] tracking-[0.3em] uppercase hidden md:flex items-center gap-3 transition-opacity hover:opacity-60"
              >
                View all
                <span className="h-px w-10 bg-foreground" />
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
