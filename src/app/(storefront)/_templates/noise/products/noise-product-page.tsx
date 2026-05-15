"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import type { Product } from "~/types";
import { buildLucideIconsWithLabels } from "~/lib/lucide-template-icons";
import { parseCardAdditionalFields } from "~/lib/products";
import { api } from "~/trpc/react";
import { useProduct } from "~/hooks/use-product";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";
import { ProductDetailsAdditionalInfoTabs } from "~/app/(storefront)/_components/product-page/additional-info-tabs";
import { ProductGalleryHorizontal } from "~/app/(storefront)/_components/product-page/product-gallery-horizontal";

import { NoiseProductCard } from "../shared/noise-product-card";
import { NoiseProductActions } from "./noise-product-actions";

export function NoiseProductPage({ product }: DefaultProductPageTemplateProps) {
  const { formatPrice, displayPrice, displayCompareAtPrice, isOnSale } =
    useProduct(product);

  const { data: relatedProducts } = api.product.getRelated.useQuery({
    productId: product.id,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [product.slug]);

  const additional = parseCardAdditionalFields(product.additionalFields);
  const trustBadges = buildLucideIconsWithLabels(additional);

  return (
    <PageTransition>
      <section className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        {/* Back */}
        <FadeIn direction="none" duration={0.3}>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-muted-foreground mb-8 gap-1.5 rounded-none font-sans text-[10px] tracking-[0.2em] uppercase"
          >
            <Link href="/shop">
              <ArrowLeft className="size-3.5" />
              Back to Shop
            </Link>
          </Button>
        </FadeIn>

        {/* Product Main */}
        <div className="flex flex-col gap-12 lg:flex-row lg:gap-20">
          {/* Image Gallery */}
          <FadeIn direction="left" className="flex-1">
            <ProductGalleryHorizontal
              images={product.images}
              productName={product.name}
              enableLightbox={true}
              styleProps={{
                singleImageContainerClassName: "rounded-none",
              }}
            />
          </FadeIn>

          {/* Details */}
          <FadeIn
            direction="right"
            delay={0.15}
            className="flex flex-1 flex-col gap-7"
          >
            {/* Name + tagline */}
            <div>
              <h1 className="text-foreground font-serif text-3xl leading-tight font-light tracking-tight md:text-4xl">
                {product.name}
              </h1>
              {additional?.productTagline && (
                <p className="text-muted-foreground mt-2 font-sans text-sm">
                  {additional.productTagline}
                </p>
              )}
            </div>

            {/* Price */}
            <div className="mb-8 flex items-center gap-3">
              <p className="text-foreground font-sans text-2xl font-medium">
                {formatPrice(displayPrice)}
              </p>

              {isOnSale && displayCompareAtPrice && (
                <span className="text-muted-foreground text-xl line-through">
                  {formatPrice(displayCompareAtPrice)}
                </span>
              )}
            </div>

            <Separator />

            {/* Add to cart / variants */}
            <NoiseProductActions product={product} />

            {/* Trust badges */}
            {trustBadges?.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {trustBadges.map((badge, i) => (
                  <div
                    key={`${badge.label}-${i}`}
                    className="border-border flex items-center gap-2 border px-3 py-2"
                  >
                    <badge.Icon className="text-muted-foreground size-3.5" />
                    <span className="text-muted-foreground font-sans text-[9px] tracking-[0.2em] uppercase">
                      {badge.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </FadeIn>
        </div>

        {/* Description tabs */}

        <ProductDetailsAdditionalInfoTabs
          product={product}
          includeCard={false}
          styleProps={{
            tabsTriggerClassName:
              "font-sans text-[10px] tracking-[0.25em] uppercase",
            tipTapRendererClassName:
              "pt-8 text-muted-foreground font-sans text-base leading-relaxed whitespace-pre-line",
            contentClassName:
              "pt-8 text-muted-foreground font-sans text-base leading-relaxed whitespace-pre-line",
          }}
        />

        {/* Related products */}
        {relatedProducts && relatedProducts.length > 0 && (
          <div className="mb-20">
            <FadeIn>
              <p className="text-muted-foreground mb-2 font-sans text-[9px] tracking-[0.4em] uppercase">
                You Might Also Like
              </p>
              <h2 className="text-foreground font-serif text-2xl font-light">
                More from the Collection
              </h2>
            </FadeIn>
            <StaggerContainer
              className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2"
              staggerDelay={0.1}
            >
              {relatedProducts.map((p, index) => (
                <StaggerItem key={p.id}>
                  <NoiseProductCard product={p as Product} index={index} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        )}
      </section>
    </PageTransition>
  );
}
