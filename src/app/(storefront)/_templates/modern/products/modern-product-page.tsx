"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import type { Product } from "~/types";
import { api } from "~/trpc/react";
import { useProduct } from "~/hooks/use-product";
import { ProductDetailsAdditionalInfoTabs } from "~/app/(storefront)/_components/product-page/additional-info-tabs";

import { ModernProductCard } from "../shared/modern-product-card";
import { ModernProductActions } from "./modern-product-actions";

export function ModernProductPage({
  product,
  business,
}: DefaultProductPageTemplateProps) {
  const {
    formatPrice,
    displayPrice,
    displayCompareAtPrice,
    isOnSale,
    additionalFields,
  } = useProduct(product);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const { data: relatedProducts } = api.product.getRelated.useQuery({
    productId: product.id,
  });

  const selectedImage = product.images[selectedImageIndex] ?? product.images[0];

  const trustBadges =
    additionalFields?.productFeatures &&
    additionalFields.productFeatures.length > 0
      ? additionalFields.productFeatures
      : [];

  return (
    <div className="bg-background">
      {/* Breadcrumb */}
      <div className="border-border border-b">
        <div className="mx-auto max-w-7xl px-6 py-4 lg:px-8">
          <Link
            href="/shop"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Shop
          </Link>
        </div>
      </div>

      {/* Product Detail */}
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Images */}
          <div>
            <div className="bg-muted relative aspect-square overflow-hidden rounded-sm">
              {selectedImage ? (
                <Image
                  src={selectedImage.url}
                  alt={selectedImage.altText ?? product.name}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-muted-foreground text-sm">
                    No image
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            {product.images.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedImageIndex(index)}
                    className={`bg-muted relative aspect-square w-16 overflow-hidden rounded-sm transition-all focus:outline-none ${
                      selectedImageIndex === index
                        ? "ring-foreground ring-1 ring-offset-1"
                        : "opacity-60 hover:opacity-100"
                    }`}
                    aria-label={`View image ${index + 1}`}
                  >
                    <Image
                      src={image.url}
                      alt={image.altText ?? `${product.name} ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex flex-col justify-center">
            <h1 className="text-foreground mt-2 font-serif text-3xl md:text-4xl">
              {product.name}
            </h1>

            {additionalFields?.productTagline && (
              <p className="text-muted-foreground mt-2 text-base italic">
                {additionalFields.productTagline}
              </p>
            )}
            <div className="mb-8 flex items-center gap-3">
              <p className="text-foreground mt-4 text-2xl font-light">
                {formatPrice(displayPrice)}
              </p>
              {isOnSale && displayCompareAtPrice && (
                <span className="text-muted-foreground text-xl line-through">
                  {formatPrice(displayCompareAtPrice)}
                </span>
              )}
            </div>

            {/* Quantity + Add to Cart Actions*/}
            <ModernProductActions product={product} />

            {/* Trust / Feature badges */}
            {trustBadges.length > 0 && (
              <div className="border-border mt-8 border-t pt-6">
                <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-widest uppercase">
                  Why choose this
                </p>
                <ul className="flex flex-col gap-2">
                  {trustBadges.map((badge, index) => (
                    <li
                      key={index}
                      className="text-muted-foreground flex items-start gap-2 text-sm"
                    >
                      <span className="bg-foreground mt-1.5 h-1 w-1 shrink-0 rounded-full" />
                      {badge.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="border-border mt-16 border-t">
          <ProductDetailsAdditionalInfoTabs
            product={product}
            includeCard={false}
            styleProps={{
              tabsClassName: "mr-auto",
              tabsListClassName: "mx-0",
              contentClassName:
                "text-muted-foreground mt-3 text-lg leading-relaxed whitespace-pre-line",
              tipTapRendererClassName:
                "text-muted-foreground mt-3 text-lg leading-relaxed whitespace-pre-line prose-neutral prose-table:mt-0",
            }}
          />
        </div>
      </div>

      {/* Related Products */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="border-border border-t">
          <div className="py-16">
            <h2 className="text-foreground font-serif text-2xl md:text-3xl">
              You may also like
            </h2>
            <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {relatedProducts?.map((p, i) => (
                <ModernProductCard
                  key={p.id}
                  product={p as Product}
                  index={i}
                />
              ))}
              {relatedProducts?.length === 0 && (
                <div className="col-span-full text-center">
                  <p className="text-muted-foreground">
                    No related products found
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
