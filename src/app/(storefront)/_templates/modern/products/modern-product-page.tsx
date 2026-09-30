"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import type { Product } from "~/types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { ANALYTICS_EVENTS } from "~/lib/umami/track";
import { api } from "~/trpc/react";
import { useProduct } from "~/hooks/use-product";
import { TrackView } from "~/components/analytics/track-view";
import { ProductReviews } from "~/components/product-reviews";
import { WriteReviewDialog } from "~/components/write-review-dialog";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { ProductDetailsAdditionalInfoTabs } from "~/app/(storefront)/_components/product-page/additional-info-tabs";
import { useVariantImage } from "~/app/(storefront)/_components/product-page/variant-image-context";

import { resolveFields } from "..";
import { ModernProductCard } from "../shared/modern-product-card";
import { ModernProductActions } from "./modern-product-actions";

export function ModernProductPage({
  product,
  business,
  productPolicies,
}: DefaultProductPageTemplateProps) {
  const {
    formatPrice,
    displayPrice,
    displayCompareAtPrice,
    isOnSale,
    additionalFields,
  } = useProduct(product);

  const f = resolveFields(business.siteContent?.customFields, [
    "modern.product.shipping-summary",
    "modern.product.returns-summary",
    "modern.product.question-text",
    "modern.product.related-heading",
    "modern.product.coming-soon-heading",
    "modern.product.coming-soon-body",
  ]);
  const shippingSummary = (f["modern.product.shipping-summary"] ?? "").trim();
  const returnsSummary = (f["modern.product.returns-summary"] ?? "").trim();
  const questionText = (f["modern.product.question-text"] ?? "").trim();
  const relatedHeading = (f["modern.product.related-heading"] ?? "").trim();
  const hasShippingPolicy = productPolicies?.hasShippingPolicy ?? false;
  const hasRefundPolicy = productPolicies?.hasRefundPolicy ?? false;

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const { isEnabled } = useStorefrontFlags();
  const reviewsEnabled = isEnabled("reviews");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  const { variantImageUrl } = useVariantImage();
  // Jump to the variant's image when the selected variant changes.
  // Depend only on variantImageUrl so manual thumbnail clicks are not overridden.
  useEffect(() => {
    if (!variantImageUrl) return;
    const idx = product.images.findIndex((img) => img.url === variantImageUrl);
    if (idx >= 0) setSelectedImageIndex(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantImageUrl]);

  const { data: relatedProducts } = api.product.getRelated.useQuery({
    productId: product.id,
  });
  const hasRelatedProducts = (relatedProducts?.length ?? 0) > 0;

  const selectedImage = product.images[selectedImageIndex] ?? product.images[0];

  const trustBadges =
    additionalFields?.productFeatures &&
    additionalFields.productFeatures.length > 0
      ? additionalFields.productFeatures
      : [];

  return (
    <div className="bg-background">
      <TrackView
        event={ANALYTICS_EVENTS.PRODUCT_VIEW}
        data={{ productId: product.id }}
      />
      {/* Breadcrumb */}
      <div className="border-border border-b">
        <div className="mx-auto max-w-7xl px-6 py-4 lg:px-8">
          <Link
            href="/shop"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
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
                    aria-pressed={selectedImageIndex === index}
                    className={`bg-muted focus-visible:ring-ring relative aspect-square w-16 overflow-hidden rounded-sm transition-all focus-visible:ring-2 focus-visible:ring-offset-2 ${
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

            {/* Buy panel — everything the "Product page" editor section
                controls sits inside this wrapper so its hotspot covers it. */}
            <div {...sectionGroupAttr("product", "details")}>
              {/* Quantity + Add to Cart Actions*/}
              <ModernProductActions
                product={product}
                comingSoonHeading={
                  f["modern.product.coming-soon-heading"] ?? ""
                }
                comingSoonBody={f["modern.product.coming-soon-body"] ?? ""}
              />

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

              {/* Shipping / Returns — each row only when its note is set */}
              {shippingSummary || returnsSummary ? (
                <div className="border-border mt-8 border-t pt-6">
                  <h2 className="sr-only">Shipping and returns</h2>
                  <dl className="flex flex-col gap-5">
                    {shippingSummary ? (
                      <div>
                        <dt className="text-foreground text-xs font-semibold tracking-widest uppercase">
                          Shipping
                        </dt>
                        <dd className="mt-2">
                          <p
                            {...fieldAttr("modern.product.shipping-summary")}
                            className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line"
                          >
                            {shippingSummary}
                          </p>
                          {hasShippingPolicy ? (
                            <Link
                              href="/shipping-policy"
                              className="text-foreground mt-2 inline-block text-sm underline underline-offset-4 transition-opacity hover:opacity-70"
                            >
                              Read the full shipping policy
                            </Link>
                          ) : null}
                        </dd>
                      </div>
                    ) : null}
                    {returnsSummary ? (
                      <div>
                        <dt className="text-foreground text-xs font-semibold tracking-widest uppercase">
                          Returns
                        </dt>
                        <dd className="mt-2">
                          <p
                            {...fieldAttr("modern.product.returns-summary")}
                            className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line"
                          >
                            {returnsSummary}
                          </p>
                          {hasRefundPolicy ? (
                            <Link
                              href="/refund-policy"
                              className="text-foreground mt-2 inline-block text-sm underline underline-offset-4 transition-opacity hover:opacity-70"
                            >
                              Read the full returns policy
                            </Link>
                          ) : null}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
              ) : null}

              {questionText ? (
                <p className="mt-6 text-sm">
                  <Link
                    href="/contact"
                    {...fieldAttr("modern.product.question-text")}
                    className="text-foreground underline underline-offset-4 transition-opacity hover:opacity-70"
                  >
                    {questionText}
                  </Link>
                </p>
              ) : null}
            </div>
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

      {/* Reviews — only mounts (and only fires review queries) when the
          reviews feature flag is enabled for this business. */}
      {reviewsEnabled && (
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="border-border border-t py-16">
            <h2 className="text-foreground font-serif text-2xl md:text-3xl">
              What customers are saying
            </h2>
            <div className="mt-10">
              <ProductReviews
                productId={product.id}
                onWriteReviewClick={() => setReviewDialogOpen(true)}
              />
            </div>
            <WriteReviewDialog
              productId={product.id}
              productName={product.name}
              isOpen={reviewDialogOpen}
              onClose={() => setReviewDialogOpen(false)}
              onSuccess={() => setReviewDialogOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Related Products — the whole block (heading included) only
          renders when there is something to show. */}
      {hasRelatedProducts ? (
        <section
          aria-labelledby={
            relatedHeading ? "modern-related-heading" : undefined
          }
          aria-label={relatedHeading ? undefined : "Related products"}
          className="mx-auto max-w-7xl px-6 lg:px-8"
        >
          <div className="border-border border-t">
            <div className="py-16">
              {relatedHeading ? (
                <h2
                  id="modern-related-heading"
                  {...fieldAttr("modern.product.related-heading")}
                  className="text-foreground font-serif text-2xl md:text-3xl"
                >
                  {relatedHeading}
                </h2>
              ) : null}
              <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                {relatedProducts?.map((p, i) => (
                  <ModernProductCard
                    key={p.id}
                    product={p as Product}
                    index={i}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
