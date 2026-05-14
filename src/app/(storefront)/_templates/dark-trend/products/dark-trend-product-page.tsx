"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ChevronLeft, Minus, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import type { DefaultProductPageTemplateProps } from "../../types";
import { api } from "~/trpc/react";
import { useProduct } from "~/hooks/use-product";
import { Spotlight } from "~/components/ui/spotlight-new";
import { buildLucideIconsWithLabels } from "~/app/(storefront)/_templates/happy-bamboo/products/index";

import { DarkTrendProductDetails } from "./dark-trend-product-details";
import { DarkTrendRelatedProducts } from "./dark-trend-related-products";
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
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
    setSelectedImage(0);
  }, [product.slug]);

  const addToCart = () => {
    handleAddToCart();
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const hasMultipleImages = product.images.length > 1;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#1A1A1A] pt-16 pb-20 text-white">
      <Spotlight />
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {/* Back Link */}
        <Link
          href="/shop"
          className="mb-8 inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Shop
        </Link>

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Product Image + Gallery */}
          <div className="flex gap-3">
            {/* Thumbnail Strip */}
            {hasMultipleImages && (
              <div className="flex flex-col gap-2">
                {product.images.map((img, i) => (
                  <button
                    key={img.url}
                    type="button"
                    onClick={() => setSelectedImage(i)}
                    aria-label={`View image ${i + 1}`}
                    className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-sm border transition-all duration-200 ${
                      selectedImage === i
                        ? "border-purple-500 opacity-100"
                        : "border-white/10 opacity-50 hover:opacity-80"
                    }`}
                  >
                    <Image
                      src={img.url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Main Image */}
            <div className="relative aspect-square min-w-0 flex-1 overflow-hidden rounded-sm bg-zinc-900/50">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedImage}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="absolute inset-0"
                >
                  <Image
                    src={
                      product.images[selectedImage]?.url ?? "/placeholder.svg"
                    }
                    alt={product.name}
                    fill
                    className="object-cover"
                    priority
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            {/* Header */}
            <div className="mb-8">
              <span className="mb-2 block text-sm font-semibold tracking-[0.2em] text-purple-500 uppercase">
                {additionalFields?.productTagline ?? "Product"}
              </span>
              <h1 className="mb-3 text-4xl font-bold tracking-tight text-white md:text-5xl">
                {product.name}
              </h1>

              <p className="leading-relaxed text-white/80">
                {product.description}
              </p>
            </div>

            {/* Price */}
            <div className="mb-8 flex items-center gap-3">
              <span className="text-3xl font-semibold text-white">
                {formatPrice(displayPrice)}
              </span>
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
                      <div className="inline-flex items-center gap-4 rounded-md bg-zinc-900/50 px-4 py-2">
                        <button
                          type="button"
                          onClick={handleDecrement}
                          disabled={quantity <= 1}
                          className="flex h-10 w-10 items-center justify-center rounded-sm bg-zinc-800 text-white/60 transition-colors hover:text-white disabled:opacity-50"
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
                          className="flex h-10 w-10 items-center justify-center rounded-sm bg-zinc-800 text-white/60 transition-colors hover:text-white disabled:opacity-50"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-4 w-4" />
                        </button>

                        <span className="text-sm text-white/60">
                          {remainingStock > 1
                            ? `${remainingStock} available`
                            : "Last one!"}
                        </span>
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
                      isAdded
                        ? "bg-violet-600"
                        : "bg-violet-500 hover:bg-violet-600"
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
                    You have the maximum available quantity in your cart
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
                    <badge.Icon className="h-4 w-4 text-purple-500" />
                    <span>{badge.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DarkTrendProductDetails product={product} />
      </div>

      <DarkTrendRelatedProducts relatedProducts={relatedProducts ?? []} />
    </div>
  );
}
