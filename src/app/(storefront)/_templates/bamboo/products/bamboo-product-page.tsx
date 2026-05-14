"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Minus, Plus, ShoppingBag } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import { computeSavingsLabel } from "~/lib/prices";
import { api } from "~/trpc/react";
import { useProduct } from "~/hooks/use-product";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { FadeIn, PageTransition } from "~/components/page-animations";

import { buildLucideIconsWithLabels } from ".";
import { BambooProductDetailsTabs } from "./bamboo-product-details-tabs";
import { BambooProductImageGallery } from "./bamboo-product-image-gallery";
import { BambooRelatedProductsSection } from "./bamboo-related-products-section";
import { BambooVariantSelector } from "./bamboo-variant-selector";

export function BambooProductPage({
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

  const [isAdded, setIsAdded] = useState(false);

  const displayTrustBadges =
    !!additionalFields?.productFeatures &&
    additionalFields?.productFeatures?.length > 0
      ? buildLucideIconsWithLabels(additionalFields)
      : [];

  const { data: relatedProducts } = api.product.getRelated.useQuery({
    productId: product.id,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [product.slug]);

  const addToCart = () => {
    handleAddToCart();
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

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

        {/* Product Main */}
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-16">
          {/* Image Gallery */}
          <FadeIn direction="left" className="flex-1">
            <BambooProductImageGallery
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
                <span className="inline-flex items-center rounded-full bg-black px-3 py-1 text-sm font-semibold text-white">
                  {computeSavingsLabel(displayPrice, displayCompareAtPrice)}
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
              {product.id === "bamboo-luxe-24" && (
                <span className="text-primary text-sm font-medium">
                  Best value per roll
                </span>
              )}
            </div>

            <Separator />

            {/* Quantity + Add to Cart */}

            {Object.keys(variantOptions).length > 0 ? (
              <BambooVariantSelector
                product={product}
                setSelectedVariantId={setSelectedVariantId}
              />
            ) : additionalFields?.comingSoon ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-800 dark:bg-amber-950">
                <p className="font-semibold text-amber-700 dark:text-amber-300">
                  Coming Soon
                </p>
                <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                  This product isn&apos;t available yet. Check back later!
                </p>
              </div>
            ) : !inStock ? (
              <Button size="lg" disabled className="flex">
                Out of Stock
              </Button>
            ) : (
              <>
                {canAddMore && (
                  <>
                    {/* Quantity Selector */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="border-border flex items-center gap-1 rounded-lg border">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-10"
                          onClick={() => handleDecrement()}
                          disabled={quantity <= 1}
                          aria-label="Decrease quantity"
                        >
                          <Minus className="size-4" />
                        </Button>
                        <span className="text-foreground w-10 text-center text-base font-semibold">
                          {quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-10"
                          onClick={() => handleIncrement()}
                          aria-label="Increase quantity"
                        >
                          <Plus className="size-4" />
                        </Button>
                      </div>
                      <Button
                        size="lg"
                        onClick={addToCart}
                        className="flex-1 gap-2 sm:flex-none"
                      >
                        {isAdded ? (
                          <>
                            <Check className="h-4 w-4" />
                            Added to Cart
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="size-5" />
                            Add to Cart -- {formatPrice(displayPrice)}
                          </>
                        )}
                      </Button>
                    </div>
                    {product.trackInventory &&
                      product.allowBackorders &&
                      (product.inventoryQty ?? 0) === 0 && (
                        <p className="text-muted-foreground text-sm">
                          Backordered — ships when available
                        </p>
                      )}
                  </>
                )}

                {!canAddMore && inStock && (
                  <p className="mt-3 text-center text-sm text-amber-500">
                    You have the maximum available quantity in your cart
                  </p>
                )}
              </>
            )}

            {/* Trust badges */}
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
        <BambooProductDetailsTabs product={product} />

        {/* Other Products */}
        <BambooRelatedProductsSection relatedProducts={relatedProducts ?? []} />
      </section>
    </PageTransition>
  );
}
