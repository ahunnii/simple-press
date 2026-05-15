"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { Product } from "~/types";
import { computeSavingsLabel } from "~/lib/prices";
import { isContentEmpty } from "~/lib/template-fields";
import { api } from "~/trpc/react";
import { useProduct } from "~/hooks/use-product";
import { PageTransition } from "~/components/page-animations";
import { TiptapRenderer } from "~/components/tiptap-renderer";
import { ProductGalleryVertical } from "~/app/(storefront)/_components/product-page/product-gallery-vertical-sticky";

import { DefaultProductCard } from "../shared/default-product-card";
import { DefaultProductActions } from "./default-product-actions";

export function DefaultProductPage({
  product,
}: DefaultProductPageTemplateProps) {
  const {
    formatPrice,
    displayPrice,
    additionalFields,
    isOnSale,
    displayCompareAtPrice,
  } = useProduct(product);

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
            <DefaultProductActions product={product} />
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
