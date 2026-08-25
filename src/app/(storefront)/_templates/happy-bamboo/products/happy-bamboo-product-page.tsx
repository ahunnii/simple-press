"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import type { Product } from "~/types";
import { computeSavingsLabel } from "~/lib/prices";
import { ANALYTICS_EVENTS } from "~/lib/umami/track";
import { api } from "~/trpc/react";
import { useProduct } from "~/hooks/use-product";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { TrackView } from "~/components/analytics/track-view";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";
import { ProductDetailsAdditionalInfoTabs } from "~/app/(storefront)/_components/product-page/additional-info-tabs";
import { ProductGalleryHorizontal } from "~/app/(storefront)/_components/product-page/product-gallery-horizontal";

import { resolveFields } from "../index";
import { HappyBambooProductCard } from "../shared/happy-bamboo-product-card";
import { HappyBambooProductActions } from "./happy-bamboo-product-actions";

export function HappyBambooProductPage({
  product,
  business,
}: DefaultProductPageTemplateProps) {
  const {
    formatPrice,
    displayPrice,
    displayCompareAtPrice,
    additionalFields,
    isOnSale,
    displayTrustBadges,
  } = useProduct(product);

  const customFields = product.business?.siteContent?.customFields;
  const fields = resolveFields(customFields, [
    "happy-bamboo.sale-badge-format",
  ]);
  const saleBadgeFormat = fields["happy-bamboo.sale-badge-format"] ?? "true";

  const { data: relatedProducts } = api.product.getRelated.useQuery({
    productId: product.id,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [product.slug]);

  return (
    <PageTransition>
      <TrackView
        event={ANALYTICS_EVENTS.PRODUCT_VIEW}
        data={{ productId: product.id }}
      />
      <section className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {/* Breadcrumb */}
        <FadeIn direction="none" duration={0.3}>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-muted-foreground mb-6 gap-1"
          >
            <Link href="/shop">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to Shop
            </Link>
          </Button>
        </FadeIn>

        {/* Product Main */}
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-16">
          {/* Image Gallery */}
          <FadeIn direction="left" className="flex-1">
            <ProductGalleryHorizontal
              images={product.images}
              productName={product.name}
              enableLightbox={true}
              mainImageFit="contain"
            />
          </FadeIn>

          {/* Details */}
          <FadeIn
            direction="right"
            delay={0.15}
            className="flex flex-1 flex-col gap-6"
          >
            <div>
              <h1 className="text-foreground font-heading text-3xl font-bold tracking-tight md:text-4xl">
                <span className="text-balance">{product.name}</span>
              </h1>
              {additionalFields?.productTagline && (
                <p className="text-muted-foreground mt-1 text-xl font-medium">
                  {additionalFields.productTagline}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              {isOnSale && displayCompareAtPrice && (
                <span className="inline-flex items-center rounded-full bg-black px-3 py-1 text-sm font-semibold text-white">
                  {computeSavingsLabel(
                    displayPrice,
                    displayCompareAtPrice,
                    saleBadgeFormat,
                  )}
                </span>
              )}
              <div className="flex items-baseline gap-2">
                <span className="text-foreground text-3xl font-bold">
                  {formatPrice(displayPrice)}
                </span>
                {isOnSale && displayCompareAtPrice && (
                  <span className="text-muted-foreground text-xl line-through">
                    {formatPrice(displayCompareAtPrice)}
                  </span>
                )}
              </div>
            </div>

            <Separator />

            {/* Quantity + Add to Cart Actions */}
            <HappyBambooProductActions product={product} business={business} />

            {/* Trust / Feature badges */}
            <div className="grid grid-cols-2 gap-3">
              {displayTrustBadges.map((badge, i) => (
                <div
                  key={`${badge.label}-${i}`}
                  className="bg-secondary/60 flex items-center gap-2 rounded-lg px-3 py-2"
                >
                  <badge.Icon
                    className="text-primary size-4"
                    aria-hidden="true"
                  />
                  <span className="text-secondary-foreground text-xs font-medium">
                    {badge.label}
                  </span>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>

        {/* Additional Information */}
        <ProductDetailsAdditionalInfoTabs
          product={product}
          styleProps={{
            cardContentClassName:
              "text-muted-foreground mt-3 text-lg leading-relaxed whitespace-pre-line",
            tipTapRendererClassName:
              "text-muted-foreground mt-3 text-lg leading-relaxed whitespace-pre-line ",
          }}
        />

        {/* Related Products */}
        {relatedProducts && relatedProducts.length > 0 && (
          <div className="mb-20">
            <FadeIn direction="up">
              <h2 className="text-foreground font-heading text-2xl font-bold">
                You Might Also Like
              </h2>
            </FadeIn>
            <StaggerContainer
              className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2"
              staggerDelay={0.12}
            >
              {relatedProducts.map((p, index) => {
                return (
                  <StaggerItem key={p.id}>
                    <HappyBambooProductCard
                      product={p as Product}
                      index={index}
                    />
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          </div>
        )}
      </section>
    </PageTransition>
  );
}
