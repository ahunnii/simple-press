"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import type { Product } from "~/types";
import { getLucideTemplateIcon } from "~/lib/lucide-template-icons";
import { parseCardAdditionalFields } from "~/lib/products";
import { api } from "~/trpc/react";
import { useProduct } from "~/hooks/use-product";
import { ProductDetailsAdditionalInfoAccordion } from "~/app/(storefront)/_components/product-page/additional-info-accordion";

import { ElegantProductCard } from "../shared/elegant-product-card";
import { ElegantProductActions } from "./elegant-product-actions";

export function ElegantProductPage({
  product,
}: DefaultProductPageTemplateProps) {
  const { formatPrice, displayPrice, displayCompareAtPrice, isOnSale } =
    useProduct(product);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 },
    );

    if (gridRef.current) {
      observer.observe(gridRef.current);
    }

    return () => {
      if (gridRef.current) {
        observer.unobserve(gridRef.current);
      }
    };
  }, []);

  const additional = parseCardAdditionalFields(product.additionalFields);

  const { data: relatedProducts } = api.product.getRelated.useQuery({
    productId: product.id,
  });

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
                    product.images[selectedImageIndex]?.url ??
                    "/placeholder.svg"
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

                <p className="text-foreground/80 leading-relaxed whitespace-pre-line">
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

              {/* Quantity + Add to Cart Actions*/}
              <ElegantProductActions product={product} />

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

              {/* Additional Information */}
              <ProductDetailsAdditionalInfoAccordion
                product={product}
                styleProps={{
                  tipTapRendererClassName: "text-primary",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      <div className="mx-auto max-w-7xl px-6 pb-20 lg:px-8">
        <div className="border-border border-t pt-16">
          <h2 className="text-foreground mb-10 font-serif text-3xl md:text-4xl">
            You May Also Like
          </h2>
          <div
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            ref={gridRef}
          >
            {relatedProducts?.map((p, i) => (
              <ElegantProductCard
                key={p.id}
                product={p as Product}
                index={i}
                isVisible={isVisible}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
