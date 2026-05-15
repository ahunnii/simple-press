"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Minus, Plus, ShieldCheck } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { Product } from "~/types";
import { computeSavingsLabel } from "~/lib/prices";
import { isContentEmpty } from "~/lib/template-fields";
import { api } from "~/trpc/react";
import { useProduct } from "~/hooks/use-product";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { PageTransition } from "~/components/page-animations";
import { TiptapRenderer } from "~/components/tiptap-renderer";
import { ProductGalleryVertical } from "~/app/(storefront)/_components/product-page/product-gallery-vertical-sticky";

import { DefaultProductCard } from "../shared/default-product-card";
import { DefaultVariantSelector } from "./default-variant-selector";

export function DefaultProductPage({
  product,
}: DefaultProductPageTemplateProps) {
  const {
    formatPrice,
    inStock,
    variantOptions,
    displayPrice,
    handleAddToCart,
    canAddMore,
    handleDecrement,
    handleIncrement,
    quantity,
    additionalFields,
    isOnSale,
    displayCompareAtPrice,
    setSelectedVariantId,
  } = useProduct(product);

  const [isAdded, setIsAdded] = useState(false);

  const { data: relatedProducts } = api.product.getRelated.useQuery({
    productId: product.id,
  });

  const primaryColor = product.business?.siteContent?.primaryColor ?? "#3b82f6";

  const trustBadges =
    additionalFields?.productFeatures &&
    additionalFields.productFeatures.length > 0
      ? additionalFields.productFeatures
      : [];
  const isAdditionalEmpty = isContentEmpty(
    additionalFields?.additionalInformation as TiptapJSON,
  );

  const addToCart = () => {
    handleAddToCart();
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <PageTransition>
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-12 md:grid-cols-8">
          {/* Images */}

          <ProductGalleryVertical
            images={product.images}
            productName={product.name}
            primaryColor={primaryColor}
            enableLightbox={true}
            styleProps={{
              containerClassName:
                "md:sticky md:top-24 md:col-span-5 md:self-start",
            }}
          />

          {/* Product Info */}
          <div className="md:col-span-3">
            <h1 className="mb-2 text-4xl font-normal text-gray-900">
              {product.name}
            </h1>
            {additionalFields?.productTagline && (
              <p className="mb-4 text-lg font-light text-gray-500">
                {additionalFields.productTagline}
              </p>
            )}
            <div className="mb-3 flex items-center gap-4">
              {isOnSale && displayCompareAtPrice && (
                <span className="inline-flex items-center rounded-full bg-black px-3 py-1 text-sm font-semibold text-white">
                  {computeSavingsLabel(displayPrice, displayCompareAtPrice)}
                </span>
              )}

              <p
                className="text-2xl font-medium"
                style={{ color: primaryColor }}
              >
                {formatPrice(displayPrice)}
              </p>
              {isOnSale && displayCompareAtPrice && (
                <span className="text-muted-foreground text-xl line-through">
                  {formatPrice(displayCompareAtPrice)}
                </span>
              )}
            </div>
            <p className="relative mb-6 w-full text-xs">
              <Link
                href="/shipping-policy"
                className="relative pb-[2px] font-semibold after:absolute after:bottom-0 after:left-0 after:block after:h-[2px] after:w-full after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:content-[''] hover:after:scale-x-100"
                style={{ display: "inline-block" }}
              >
                Shipping
              </Link>{" "}
              calculated at checkout
            </p>
            {/* Variant Options */}
            {Object.keys(variantOptions).length > 0 ? (
              <DefaultVariantSelector
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
                  <div className="flex flex-col gap-2">
                    <Label>Quantity</Label>
                    <div className="flex items-center gap-2">
                      <div className="flex w-fit items-center rounded-md border">
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
                        <span className="w-10 text-center text-base font-semibold">
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
                      {product.trackInventory && (
                        <span className="text-sm text-gray-600">
                          {product.inventoryQty ?? 0} available
                        </span>
                      )}
                    </div>
                    <Button
                      type="button"
                      onClick={addToCart}
                      className="flex-1"
                    >
                      {isAdded ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Added to Cart
                        </>
                      ) : (
                        `Add ${quantity} to Cart`
                      )}
                    </Button>
                    {product.trackInventory &&
                      product.allowBackorders &&
                      (product.inventoryQty ?? 0) === 0 && (
                        <p className="text-muted-foreground text-sm">
                          Backordered — ships when available
                        </p>
                      )}
                  </div>
                )}

                {!canAddMore && inStock && (
                  <p className="mt-3 text-center text-sm text-amber-500">
                    You have the maximum available quantity in your cart
                  </p>
                )}
              </>
            )}
            <p className="my-16 leading-relaxed font-semibold tracking-wide whitespace-pre-line text-zinc-800">
              {product.description ?? "No description available."}
            </p>{" "}
            {/* Trust badges */}
            {trustBadges.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {trustBadges.map((badge, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                  >
                    <ShieldCheck
                      className="h-4 w-4 shrink-0 text-blue-500"
                      style={{ color: primaryColor }}
                    />
                    <span className="text-xs text-gray-600">{badge.text}</span>
                  </div>
                ))}
              </div>
            )}
            {!isAdditionalEmpty && (
              <TiptapRenderer
                content={additionalFields?.additionalInformation as TiptapJSON}
                className="prose prose-sm dark:prose-invert my-16 max-w-none text-base font-semibold tracking-wide text-zinc-800"
              />
            )}
          </div>
        </div>

        <div className="mt-16 border-t pt-10">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">
            You Might Also Like
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts?.map((p, index) => (
              <DefaultProductCard
                key={p.id}
                product={p as Product}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
