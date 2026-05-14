"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Minus, Plus, ShoppingBag } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import { api } from "~/trpc/react";
import { useProduct } from "~/hooks/use-product";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { FadeIn, PageTransition } from "~/components/page-animations";
import { buildLucideIconsWithLabels } from "~/app/(storefront)/_templates/happy-bamboo/products/index";

import { PollenProductDetailsTabs } from "./pollen-product-details-tabs";
import { PollenProductImageGallery } from "./pollen-product-image-gallery";
import { PollenRelatedProductsSection } from "./pollen-related-products-section";
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
            <PollenProductImageGallery
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

            {Object.keys(variantOptions).length > 0 ? (
              <PollenVariantSelector
                product={product}
                setSelectedVariantId={setSelectedVariantId}
              />
            ) : (
              <>
                {canAddMore && (
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-1 rounded-md border border-[#2a351f]/20">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-10 text-[#2a351f] hover:bg-[#2a351f]/5"
                        onClick={() => handleDecrement()}
                        disabled={quantity <= 1}
                        aria-label="Decrease quantity"
                      >
                        <Minus className="size-4" />
                      </Button>
                      <span className="w-10 text-center text-base font-semibold text-[#2a351f]">
                        {quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-10 text-[#2a351f] hover:bg-[#2a351f]/5"
                        onClick={() => handleIncrement()}
                        aria-label="Increase quantity"
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>
                    <Button
                      size="lg"
                      onClick={addToCart}
                      className="flex-1 gap-2 bg-[#215935] text-white hover:bg-[#1a4729] sm:flex-none"
                    >
                      {isAdded ? (
                        <>
                          <Check className="h-4 w-4" />
                          Added to Cart
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="size-5" />
                          Add to Cart — {formatPrice(displayPrice)}
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {!canAddMore && inStock && (
                  <p className="mt-3 text-center text-sm text-amber-600">
                    You have the maximum available quantity in your cart
                  </p>
                )}

                {!inStock && (
                  <p className="mt-3 text-center text-sm font-medium text-red-600">
                    Out of stock
                  </p>
                )}
              </>
            )}

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

        <PollenProductDetailsTabs product={product} />

        <PollenRelatedProductsSection relatedProducts={relatedProducts ?? []} />
      </section>
    </PageTransition>
  );
}
