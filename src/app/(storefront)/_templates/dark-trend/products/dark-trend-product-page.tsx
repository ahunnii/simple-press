"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft, Minus, Plus } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import type { Product } from "~/types";
import { buildLucideIconsWithLabels } from "~/lib/lucide-template-icons";
import { computeSavingsLabel } from "~/lib/prices";
import { api } from "~/trpc/react";
import { useProduct } from "~/hooks/use-product";
import { Spotlight } from "~/components/ui/spotlight-new";
import { ProductGalleryHorizontal } from "~/app/(storefront)/_components/product-page/product-gallery-horizontal";

import { DarkTrendProductCard } from "../shared/dark-trend-product-card";
import { DarkTrendProductDetails } from "./dark-trend-product-details";
import { DarkTrendVariantSelector } from "./dark-trend-variant-selector";

export function DarkTrendProductPage({
  product,
}: DefaultProductPageTemplateProps) {
  const {
    formatPrice,
    inStock,
    variantOptions,
    displayPrice,
    handleAddToCart,
    remainingStock,
    canAddMore,
    handleDecrement,
    handleIncrement,
    quantity,
    setSelectedVariantId,
    additionalFields,
    isOnSale,
    displayCompareAtPrice,
    isInventoryTracked,
    maxUntracked,
  } = useProduct(product);

  const { data: relatedProducts } = api.product.getRelated.useQuery({
    productId: product.id,
  });

  const trustBadges =
    !!additionalFields?.productFeatures &&
    additionalFields?.productFeatures?.length > 0
      ? buildLucideIconsWithLabels(additionalFields)
      : [];

  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [product.slug]);

  const addToCart = () => {
    handleAddToCart();
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden pt-16 pb-20">
      <Spotlight />
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {/* Back Link */}
        <Link
          href="/shop"
          className="text-muted-foreground hover:text-foreground mb-8 inline-flex items-center gap-2 text-sm transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
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
              <span className="text-primary mb-2 block text-sm font-semibold tracking-[0.2em] uppercase">
                {additionalFields?.productTagline?.trim() !== ""
                  ? additionalFields?.productTagline
                  : "Product"}
              </span>
              <h1 className="mb-3 text-4xl font-bold tracking-tight md:text-5xl">
                {product.name}
              </h1>

              <p className="text-muted-foreground leading-relaxed">
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

            {Object.keys(variantOptions).length > 0 ? (
              <DarkTrendVariantSelector
                product={product}
                setSelectedVariantId={setSelectedVariantId}
              />
            ) : (
              <>
                {canAddMore && (
                  <>
                    {/* Quantity Selector */}
                    <div className="mb-8">
                      <label className="mb-3 block text-sm font-medium text-white">
                        Quantity
                      </label>
                      <div className="bg-card inline-flex items-center gap-4 rounded-md px-4 py-2">
                        <button
                          type="button"
                          onClick={handleDecrement}
                          disabled={quantity <= 1}
                          className="flex h-10 w-10 items-center justify-center rounded-sm bg-white/10 text-white/60 transition-colors hover:bg-white/20 hover:text-white disabled:opacity-50"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center font-medium text-white">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={handleIncrement}
                          disabled={quantity >= remainingStock}
                          className="flex h-10 w-10 items-center justify-center rounded-sm bg-white/10 text-white/60 transition-colors hover:bg-white/20 hover:text-white disabled:opacity-50"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-4 w-4" />
                        </button>

                        {isInventoryTracked && (
                          <span className="text-sm text-white/60">
                            {remainingStock > 1
                              ? `${remainingStock} available`
                              : "Last one!"}
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Add to Cart Buttons */}
                <div className="mb-10 flex flex-col gap-4 sm:flex-row">
                  <button
                    type="button"
                    onClick={addToCart}
                    className={`inline-flex flex-1 items-center justify-center gap-2 rounded-md px-8 py-4 text-sm font-semibold tracking-wider text-white uppercase transition-all ${
                      isAdded ? "bg-primary" : "bg-primary hover:bg-primary/90"
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="h-4 w-4" />
                        Added to Cart
                      </>
                    ) : (
                      "Add to Cart"
                    )}
                  </button>
                  <button
                    type="button"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-white/60 bg-transparent px-8 py-4 text-sm font-medium tracking-wider text-white uppercase transition-colors hover:bg-white/10"
                  >
                    Buy Now
                  </button>
                </div>

                {!canAddMore && inStock && (
                  <p className="mt-3 text-center text-sm text-amber-500">
                    {isInventoryTracked
                      ? "You have the maximum available quantity in your cart"
                      : `Maximum of ${maxUntracked} per order`}
                  </p>
                )}
              </>
            )}

            {/* Trust badges */}
            {trustBadges.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-4 border-t border-white/10 pt-8">
                {trustBadges.map((badge, i) => (
                  <div
                    key={`${badge.label}-${i}`}
                    className="flex items-center gap-2 text-sm text-white/60"
                  >
                    <badge.Icon className="text-primary h-4 w-4" />
                    <span>{badge.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DarkTrendProductDetails product={product} />
      </div>

      {/* Other Products */}

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
        </div>
      </div>
    </div>
  );
}
