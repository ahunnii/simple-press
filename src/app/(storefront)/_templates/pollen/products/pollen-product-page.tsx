"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Minus, Plus, ShoppingBag } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import type { Product } from "~/types";
import { buildLucideIconsWithLabels } from "~/lib/lucide-template-icons";
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

import { PollenProductCard } from "../shared/pollen-product-card";
import { PollenProductActions } from "./pollen-product-actions";
import { PollenVariantSelector } from "./pollen-variant-selector";

export function PollenProductPage({
  product,
}: DefaultProductPageTemplateProps) {
  const {
    formatPrice,
    inStock,
    variantOptions,
    displayPrice,
    displayCompareAtPrice,
    handleAddToCart,
    canAddMore,
    handleDecrement,
    handleIncrement,
    quantity,
    setSelectedVariantId,
    additionalFields,
    isOnSale,
  } = useProduct(product);

  const { data: relatedProducts } = api.product.getRelated.useQuery({
    productId: product.id,
  });

  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [product.slug]);

  const addToCart = () => {
    handleAddToCart();
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const displayTrustBadges =
    additionalFields?.productFeatures &&
    additionalFields.productFeatures.length > 0
      ? buildLucideIconsWithLabels(additionalFields)
      : [];

  return (
    <PageTransition>
      <section className="mx-auto mt-28 max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <FadeIn direction="none" duration={0.3}>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="mb-6 gap-1 text-[#4c566a] hover:text-[#215935]"
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
              enableLightbox={true}
              productName={product.name}
              styleProps={{
                singleImageContainerClassName: "rounded-md",
              }}
            />
          </FadeIn>

          {/* Details */}
          <FadeIn
            direction="right"
            delay={0.15}
            className="flex flex-1 flex-col gap-6"
          >
            <div>
              <h1 className="text-3xl font-bold text-[#2a351f] md:text-4xl">
                {product.name}
              </h1>
              {additionalFields?.productTagline && (
                <p className="mt-1 text-lg font-medium text-[#5e7747]">
                  {additionalFields.productTagline}
                </p>
              )}
            </div>

            {/* Price */}
            <div className="flex flex-wrap items-baseline gap-3">
              {isOnSale && displayCompareAtPrice && (
                <span className="inline-flex items-center rounded-full bg-[#215935] px-3 py-1 text-sm font-semibold text-white">
                  Sale
                </span>
              )}
              <span className="text-3xl font-bold text-[#215935]">
                {formatPrice(displayPrice)}
              </span>
              {isOnSale && displayCompareAtPrice && (
                <span className="text-xl text-[#4c566a] line-through">
                  {formatPrice(displayCompareAtPrice)}
                </span>
              )}
            </div>

            <Separator />

            {/* Quantity + Add to Cart Actions */}
            <PollenProductActions product={product} />

            {/* Trust Badges */}
            {displayTrustBadges.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {displayTrustBadges.map((badge, i) => (
                  <div
                    key={`${badge.label}-${i}`}
                    className="flex items-center gap-2 rounded-md bg-[#f5f2ee] px-3 py-2"
                  >
                    <badge.Icon className="size-4 text-[#215935]" />
                    <span className="text-xs font-medium text-[#2a351f]">
                      {badge.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </FadeIn>
        </div>

        {/* Additional Information */}
        <ProductDetailsAdditionalInfoTabs
          product={product}
          includeCard={false}
          styleProps={{
            contentClassName:
              "whitespace-pre-line text-lg leading-relaxed text-[#4c566a]",
            tipTapRendererClassName:
              "whitespace-pre-line text-lg leading-relaxed text-[#4c566a]",
          }}
        />

        {/* Related Products */}
        <div className="mb-20">
          <FadeIn direction="up">
            <h2 className="text-2xl font-bold tracking-wide text-[#2a351f] uppercase">
              You Might Also Like
            </h2>
          </FadeIn>
          <StaggerContainer
            className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2"
            staggerDelay={0.12}
          >
            {relatedProducts?.map((p, i) => (
              <StaggerItem key={p.id}>
                <PollenProductCard product={p as Product} index={i} />
              </StaggerItem>
            ))}
            {relatedProducts?.length === 0 && (
              <div className="col-span-full text-center">
                <p className="text-[#4c566a]">No related products found</p>
              </div>
            )}
          </StaggerContainer>
        </div>
      </section>
    </PageTransition>
  );
}
