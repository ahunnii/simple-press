"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import type { Product } from "~/types";
import { buildLucideIconsWithLabels } from "~/lib/lucide-template-icons";
import { computeSavingsLabel } from "~/lib/prices";
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

import { BambooHorizontalProductCard } from "../shared/bamboo-product-card";
import { DEFAULT_LUCIDE_ICONS_WITH_LABELS } from "../shop";
import { BambooProductActions } from "./bamboo-product-actions";

export function BambooProductPage({
  product,
  business,
}: DefaultProductPageTemplateProps) {
  const {
    formatPrice,
    displayPrice,
    displayCompareAtPrice,
    additionalFields,
    isOnSale,
  } = useProduct(product);

  const displayTrustBadges =
    !!additionalFields?.productFeatures &&
    additionalFields?.productFeatures?.length > 0
      ? buildLucideIconsWithLabels(
          additionalFields,
          DEFAULT_LUCIDE_ICONS_WITH_LABELS,
        )
      : [];

  const { data: relatedProducts } = api.product.getRelated.useQuery({
    productId: product.id,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [product.slug]);

  return (
    <PageTransition>
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
              <ArrowLeft className="size-4" />
              Back to Shop
            </Link>
          </Button>
        </FadeIn>

        <div className="flex flex-col gap-10 lg:flex-row lg:gap-16">
          {/* Image Gallery */}
          <FadeIn direction="left" className="flex-1">
            <ProductGalleryHorizontal
              images={product.images}
              productName={product.name}
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
                <p className="text-muted-foreground mt-1 text-lg font-light">
                  {additionalFields.productTagline}
                </p>
              )}
              <p className="text-muted-foreground mt-3 text-lg leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              {isOnSale && displayCompareAtPrice && (
                <span className="bg-foreground text-background inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold">
                  {computeSavingsLabel(displayPrice, displayCompareAtPrice)}
                </span>
              )}
              <div className="flex items-baseline gap-2">
                <span className="text-foreground text-3xl font-bold">
                  {formatPrice(displayPrice)}
                </span>
                {isOnSale && displayCompareAtPrice && (
                  <span className="text-muted-foreground text-xl line-through">
                    <span className="sr-only">Original price: </span>
                    {formatPrice(displayCompareAtPrice)}
                  </span>
                )}
              </div>
            </div>

            <Separator />

            {/* Quantity + Add to Cart Actions*/}
            <BambooProductActions product={product} business={business} />

            {/* Trust / Feature badges */}
            <div className="grid grid-cols-2 gap-3">
              {displayTrustBadges?.map((badge) => (
                <div
                  key={badge.label}
                  className="bg-secondary/60 flex items-center gap-2 rounded-lg px-3 py-2"
                >
                  <badge.Icon className="text-primary size-4" />
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
          }}
        />

        {/* Related Products */}
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
            {relatedProducts?.map((p, index) => {
              return (
                <StaggerItem key={p.id}>
                  <BambooHorizontalProductCard
                    product={p as Product}
                    index={index}
                  />
                </StaggerItem>
              );
            })}
            {relatedProducts?.length === 0 && (
              <div className="col-span-full text-center">
                <p className="text-muted-foreground">
                  No related products found
                </p>
              </div>
            )}
          </StaggerContainer>
        </div>
      </section>
    </PageTransition>
  );
}
