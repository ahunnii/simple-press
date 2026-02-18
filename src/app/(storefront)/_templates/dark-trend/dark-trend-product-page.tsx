"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ChevronLeft, Minus, Plus } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../types";
import { useProduct } from "~/hooks/use-product";
import { Spotlight } from "~/components/ui/spotlight-new";

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
  } = useProduct(product);

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
    <div className="relative min-h-screen bg-[#1A1A1A] pt-28 pb-20 text-white">
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
          {/* Product Image */}
          <div className="relative aspect-square overflow-hidden rounded-sm bg-zinc-900/50">
            <Image
              src={product?.images[0]?.url ?? "/placeholder.svg"}
              alt={product.name}
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            {/* Header */}
            <div className="mb-8">
              <span className="mb-2 block text-sm font-semibold tracking-[0.2em] text-purple-500 uppercase">
                Product
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
          </div>
        </div>
      </div>
    </div>
  );
}
