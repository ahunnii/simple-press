"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ChevronLeft, Minus, Plus } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import { parseCardAdditionalFields } from "~/lib/products";
import { getLucideTemplateIcon } from "~/lib/lucide-template-icons";
import { useProduct } from "~/hooks/use-product";
import { api } from "~/trpc/react";

import { ElegantProductDetailsAccordion } from "./elegant-product-details-accordion";
import { ElegantRelatedProductsSection } from "./elegant-related-products-section";
import { ElegantVariantSelector } from "./elegant-variant-selector";

export function ElegantProductPage({
  product,
}: DefaultProductPageTemplateProps) {
  const {
    formatPrice,
    inStock,
    variantOptions,
    displayPrice,
    displayCompareAtPrice,
    isOnSale,
    handleAddToCart,
    remainingStock,
    canAddMore,
    handleDecrement,
    handleIncrement,
    quantity,
    selectedVariantId,
    setSelectedVariantId,
  } = useProduct(product);

  const [isAdded, setIsAdded] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const additional = parseCardAdditionalFields(product.additionalFields);

  const { data: relatedProducts } = api.product.getRelated.useQuery({
    productId: product.id,
  });

  const addToCart = () => {
    handleAddToCart();
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    setSelectedImageIndex(0);
  }, [product.slug]);

  return (
    <>
    <div className="pt-28 pb-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Back Link */}
        <Link
          href="/shop"
          className="text-muted-foreground hover:text-foreground boty-transition mb-8 inline-flex items-center gap-2 text-sm"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Shop
        </Link>

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Product Images */}
          <div className="flex flex-col gap-4">
            <div className="bg-card boty-shadow relative aspect-square overflow-hidden rounded-3xl">
              <Image
                src={
                  product.images[selectedImageIndex]?.url ?? "/placeholder.svg"
                }
                alt={product.name}
                fill
                className="object-cover"
                priority
              />
            </div>

            {product.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {product.images.map((image, index) => (
                  <button
                    key={image.url}
                    type="button"
                    onClick={() => setSelectedImageIndex(index)}
                    className={`boty-shadow relative aspect-square w-20 flex-none overflow-hidden rounded-2xl transition-all duration-200 ${
                      selectedImageIndex === index
                        ? "ring-primary ring-2"
                        : "opacity-50 hover:opacity-80"
                    }`}
                    aria-label={`View image ${index + 1}`}
                  >
                    <Image
                      src={image.url}
                      alt={`${product.name} image ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            {/* Header */}
            <div className="mb-8">
              <span className="text-primary mb-2 block text-sm tracking-[0.3em] uppercase">
                Product
              </span>
              <h1 className="text-foreground mb-3 font-serif text-4xl md:text-5xl">
                {product.name}
              </h1>

              {additional?.productTagline && (
                <p className="text-muted-foreground mb-4 text-lg italic">
                  {additional.productTagline}
                </p>
              )}

              <p className="text-foreground/80 leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Price */}
            <div className="mb-8 flex items-center gap-3">
              <span className="text-foreground text-3xl font-medium">
                {formatPrice(displayPrice)}
              </span>

              {isOnSale && displayCompareAtPrice && (
                <span className="text-muted-foreground text-xl line-through">
                  {formatPrice(displayCompareAtPrice)}
                </span>
              )}
            </div>

            {Object.keys(variantOptions).length > 0 ? (
              <ElegantVariantSelector
                product={product}
                selectedVariantId={selectedVariantId}
                setSelectedVariantId={setSelectedVariantId}
              />
            ) : (
              <>
                {canAddMore && (
                  <>
                    {/* Quantity Selector */}
                    <div className="mb-8">
                      <label className="text-foreground mb-3 block text-sm font-medium">
                        Quantity
                      </label>
                      <div className="bg-card boty-shadow inline-flex items-center gap-4 rounded-full px-2 py-2">
                        <button
                          type="button"
                          onClick={handleDecrement}
                          disabled={quantity <= 1}
                          className="bg-background text-foreground/60 hover:text-foreground boty-transition flex h-10 w-10 items-center justify-center rounded-full"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="text-foreground w-8 text-center font-medium">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={handleIncrement}
                          disabled={quantity >= remainingStock}
                          className="bg-background text-foreground/60 hover:text-foreground boty-transition flex h-10 w-10 items-center justify-center rounded-full"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-4 w-4" />
                        </button>

                        <span className="text-sm text-gray-500">
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
                    className={`boty-transition boty-shadow inline-flex flex-1 items-center justify-center gap-2 rounded-full px-8 py-4 text-sm tracking-wide ${
                      isAdded
                        ? "bg-primary/80 text-primary-foreground"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
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
                    className="border-foreground/20 text-foreground boty-transition hover:bg-foreground/5 inline-flex flex-1 items-center justify-center gap-2 rounded-full border bg-transparent px-8 py-4 text-sm tracking-wide"
                  >
                    Buy Now
                  </button>
                </div>

                {!canAddMore && inStock && (
                  <p className="mt-3 text-center text-sm text-amber-600">
                    You have the maximum available quantity in your cart
                  </p>
                )}
              </>
            )}

            {/* Product features */}
            {additional?.productFeatures &&
              additional.productFeatures.length > 0 && (
                <div className="mb-8">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {additional.productFeatures.map((feature, index) => {
                      const Icon = getLucideTemplateIcon(feature.icon);
                      return (
                        <div
                          key={index}
                          className="boty-shadow bg-card flex flex-col items-center gap-3 rounded-2xl px-4 py-6"
                        >
                          {Icon && (
                            <Icon className="text-foreground/50 h-7 w-7" />
                          )}
                          <span className="text-foreground/70 text-center text-sm">
                            {feature.text}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            <ElegantProductDetailsAccordion product={product} />
          </div>
        </div>
      </div>
    </div>

    <ElegantRelatedProductsSection relatedProducts={relatedProducts ?? []} />
    </>
  );
}
