"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import type { Product } from "~/types";
import { buildLucideIconsWithLabels } from "~/lib/lucide-template-icons";
import { computeSavingsLabel } from "~/lib/prices";
import { ANALYTICS_EVENTS } from "~/lib/umami/track";
import { api } from "~/trpc/react";
import { useProduct } from "~/hooks/use-product";
import { Spotlight } from "~/components/ui/spotlight-new";
import { TrackView } from "~/components/analytics/track-view";
import { ProductGalleryHorizontal } from "~/app/(storefront)/_components/product-page/product-gallery-horizontal";

import { DarkTrendProductCard } from "../shared/dark-trend-product-card";
import { DarkTrendProductActions } from "./dark-trend-product-actions";
import { DarkTrendProductDetails } from "./dark-trend-product-details";

export function DarkTrendProductPage({
  product,
  business,
}: DefaultProductPageTemplateProps) {
  const {
    formatPrice,
    displayPrice,
    additionalFields,
    isOnSale,
    displayCompareAtPrice,
  } = useProduct(product);

  const { data: relatedProducts } = api.product.getRelated.useQuery({
    productId: product.id,
  });

  const trustBadges =
    !!additionalFields?.productFeatures &&
    additionalFields?.productFeatures?.length > 0
      ? buildLucideIconsWithLabels(additionalFields)
      : [];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [product.slug]);

  return (
    <div className="relative min-h-screen overflow-x-hidden pt-16 pb-20">
      <TrackView
        event={ANALYTICS_EVENTS.PRODUCT_VIEW}
        data={{ productId: product.id }}
      />
      <Spotlight />
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {/* Back Link */}
        <Link
          href="/shop"
          className="text-muted-foreground hover:text-foreground mb-8 inline-flex items-center gap-2 text-sm transition-colors"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Back to Shop
        </Link>

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Product Image + Gallery */}
          <ProductGalleryHorizontal
            images={product.images}
            productName={product.name}
            enableLightbox={true}
          />
          {/* Product Info */}
          <div className="flex flex-col">
            {/* Header */}
            <div className="mb-8">
              <span className="mb-2 block text-sm font-semibold tracking-[0.2em] text-purple-400 uppercase">
                {additionalFields?.productTagline?.trim() !== ""
                  ? additionalFields?.productTagline
                  : "Product"}
              </span>
              <h1 className="mb-3 text-4xl font-bold tracking-tight md:text-5xl">
                {product.name}
              </h1>

              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>

            {/* Price */}
            <div className="mb-8 flex items-center gap-3">
              {isOnSale && displayCompareAtPrice && (
                <span className="bg-primary inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold">
                  {computeSavingsLabel(displayPrice, displayCompareAtPrice)}
                </span>
              )}

              <div className="flex items-baseline gap-2">
                <span className="text-foreground text-3xl font-semibold">
                  {formatPrice(displayPrice)}
                </span>
                {isOnSale && displayCompareAtPrice && (
                  <span className="text-muted-foreground text-xl line-through">
                    {formatPrice(displayCompareAtPrice)}
                  </span>
                )}
              </div>
            </div>

            {/* Quantity + Add to Cart Actions*/}
            <DarkTrendProductActions product={product} business={business} />

            {/* Trust / Feature badges */}
            {trustBadges.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-4 border-t border-white/10 pt-8">
                {trustBadges.map((badge, i) => (
                  <div
                    key={`${badge.label}-${i}`}
                    className="flex items-center gap-2 text-sm text-white/60"
                  >
                    <badge.Icon
                      className="h-4 w-4 text-purple-400"
                      aria-hidden="true"
                    />
                    <span>{badge.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Additional Information */}
        <DarkTrendProductDetails product={product} />
      </div>

      {/* Related Products */}
      <div className="mx-auto max-w-7xl px-6 pb-20 lg:px-8">
        <div className="mb-10 flex items-baseline gap-4">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            You May Also Like
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {relatedProducts?.map((p, i) => (
            <DarkTrendProductCard key={p.id} product={p as Product} index={i} />
          ))}
          {relatedProducts?.length === 0 && (
            <div className="col-span-full text-center">
              <p className="text-muted-foreground">No related products found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
