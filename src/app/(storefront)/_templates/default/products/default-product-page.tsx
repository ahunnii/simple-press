"use client";

import { useState } from "react";
import Link from "next/link";

import type { DefaultProductPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { Product } from "~/types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { computeSavingsLabel } from "~/lib/prices";
import {
  getListFieldValue,
  isContentEmpty,
  parseTemplateTrustBadgesListRows,
} from "~/lib/template-fields";
import { ANALYTICS_EVENTS } from "~/lib/umami/track";
import { api } from "~/trpc/react";
import { useProduct } from "~/hooks/use-product";
import { TrackView } from "~/components/analytics/track-view";
import { PageTransition } from "~/components/page-animations";
import { ProductReviews } from "~/components/product-reviews";
import { TiptapRenderer } from "~/components/tiptap-renderer";
import { WriteReviewDialog } from "~/components/write-review-dialog";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { ProductGalleryVertical } from "~/app/(storefront)/_components/product-page/product-gallery-vertical-sticky";
import { WishlistButton } from "~/app/(storefront)/_components/wishlist/wishlist-button";

import { resolveFields } from "..";
import { DefaultProductCard } from "../shared/default-product-card";
import { DefaultProductActions } from "./default-product-actions";

function AccordionItem({
  summary,
  children,
  defaultOpen,
}: {
  summary: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="group border-b border-[#e8e8e8] py-5 first:border-t"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium select-none [&::-webkit-details-marker]:hidden">
        {summary}
        <span
          aria-hidden="true"
          className="text-xl font-light transition-transform duration-200 group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <div className="pt-3.5 text-sm leading-[1.7] text-[#6b6b6b]">
        {children}
      </div>
    </details>
  );
}

export function DefaultProductPage({
  product,
  business,
}: DefaultProductPageTemplateProps) {
  const {
    formatPrice,
    displayPrice,
    additionalFields,
    isOnSale,
    displayCompareAtPrice,
    displayTrustBadges,
  } = useProduct(product);

  const { isEnabled } = useStorefrontFlags();
  const reviewsEnabled = isEnabled("reviews");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  const { data: relatedProducts } = api.product.getRelated.useQuery({
    productId: product.id,
  });

  const isAdditionalEmpty = isContentEmpty(
    additionalFields?.additionalInformation as TiptapJSON,
  );
  const f = resolveFields(business?.siteContent?.customFields, [
    "default.global.product-shipping-description",
    "default.global.product-question-description",
  ]);
  const globalProductTrustBadges = parseTemplateTrustBadgesListRows(
    getListFieldValue(
      business?.siteContent?.customFields,
      "default.global.product-trust-badges",
    ),
    [
      {
        label: "Ships in 1-2 business days",
      },
      {
        label: "Free returns within 30 days",
      },
    ],
  );

  return (
    <PageTransition>
      <TrackView
        event={ANALYTICS_EVENTS.PRODUCT_VIEW}
        data={{ productId: product.id }}
      />
      <div className="mx-auto max-w-[1440px] px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 pt-6 pb-8 text-[11px] font-medium tracking-[0.14em] text-[#6b6b6b] uppercase"
        >
          <Link href="/" className="transition-colors hover:text-[#0a0a0a]">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <Link href="/shop" className="transition-colors hover:text-[#0a0a0a]">
            Shop
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="font-semibold text-[#0a0a0a]">
            {product.name}
          </span>
        </nav>

        {/* PDP layout */}
        <div className="grid grid-cols-1 gap-10 pb-24 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
          {/* Gallery */}
          <ProductGalleryVertical
            images={product.images}
            productName={product.name}
            enableLightbox
            styleProps={{
              containerClassName:
                "lg:sticky lg:top-[calc(72px+24px)] lg:self-start",
            }}
          />

          {/* Info panel */}
          <div className="flex flex-col gap-6">
            {/* Name + price */}
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <h1 className="font-serif text-[36px] leading-[1.1] font-medium tracking-[-0.02em]">
                  {product.name}
                </h1>
                <WishlistButton
                  item={{
                    productId: product.id,
                    name: product.name,
                    slug: product.slug,
                    price: displayPrice,
                    imageUrl: product.images[0]?.url ?? null,
                  }}
                  className="mt-1 shrink-0 rounded-full border border-[#e8e8e8] bg-white text-[#0a0a0a]"
                />
              </div>
              {additionalFields?.productTagline && (
                <p className="text-sm text-[#6b6b6b]">
                  {additionalFields.productTagline}
                </p>
              )}
              <div className="flex items-center gap-4">
                <span className="text-[22px] font-medium">
                  {formatPrice(displayPrice)}
                </span>
                {isOnSale && displayCompareAtPrice && (
                  <>
                    <span className="text-[18px] text-[#6b6b6b] line-through">
                      {formatPrice(displayCompareAtPrice)}
                    </span>
                    <span className="inline-flex items-center rounded-[2px] bg-[#0a0a0a] px-2 py-0.5 text-[10px] font-medium tracking-[0.14em] text-white uppercase">
                      {computeSavingsLabel(displayPrice, displayCompareAtPrice)}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-[15px] leading-[1.65] text-[#6b6b6b]">
                {product.description}
              </p>
            )}

            {/* Actions (variant selector + qty + add to cart) */}
            <DefaultProductActions product={product} business={business} />

            {/* Trust signals */}
            <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-[13px] text-[#6b6b6b]">
              {globalProductTrustBadges?.map((badge) => (
                <span key={badge.label}>
                  <span aria-hidden="true">✓</span> {badge.label}
                </span>
              ))}
              {displayTrustBadges.map((badge) => (
                <span key={badge.label}>
                  <span aria-hidden="true">✓</span> {badge.label}
                </span>
              ))}
            </div>

            {/* Accordion — the shipping/question copy inside comes from the
                "Product page details" section, so the whole block is one
                editor hotspot (never annotate the same group twice). */}
            <div className="mt-2" {...sectionGroupAttr("product", "details")}>
              <AccordionItem summary="Details" defaultOpen>
                {!isAdditionalEmpty ? (
                  <TiptapRenderer
                    content={
                      additionalFields?.additionalInformation as TiptapJSON
                    }
                    className="prose prose-sm max-w-none"
                  />
                ) : (
                  <p>
                    Materials, care instructions, and any other details about
                    this product. Edit this from your product settings under
                    &apos;Additional Information&apos; in the admin panel.
                  </p>
                )}
              </AccordionItem>
              {f["default.global.product-shipping-description"] && (
                <AccordionItem summary="Shipping &amp; returns">
                  <p>{f["default.global.product-shipping-description"]}</p>
                </AccordionItem>
              )}

              {f["default.global.product-question-description"] && (
                <AccordionItem summary="Ask a question">
                  <p>
                    {f["default.global.product-question-description"]}{" "}
                    <Link
                      href="/contact"
                      className="underline hover:no-underline"
                    >
                      You can reach out to us here.
                    </Link>
                  </p>
                </AccordionItem>
              )}
            </div>

            {/* Shipping link */}
            <p className="text-xs text-[#6b6b6b]">
              <Link
                href="/shipping-policy"
                className="underline hover:no-underline"
              >
                Shipping
              </Link>{" "}
              calculated at checkout
            </p>
          </div>
        </div>

        {/* Reviews — only mounts (and only fires review queries) when the
            reviews feature flag is enabled for this business. */}
        {reviewsEnabled && (
          <section className="border-t border-[#e8e8e8] pt-16 pb-24">
            <div className="mb-10">
              <p className="mb-1.5 text-xs font-medium tracking-[0.14em] text-[#6b6b6b] uppercase">
                Reviews
              </p>
              <h2 className="font-serif text-3xl font-semibold tracking-tight">
                What customers are saying
              </h2>
            </div>
            <ProductReviews
              productId={product.id}
              onWriteReviewClick={() => setReviewDialogOpen(true)}
            />
            <WriteReviewDialog
              productId={product.id}
              productName={product.name}
              isOpen={reviewDialogOpen}
              onClose={() => setReviewDialogOpen(false)}
              onSuccess={() => setReviewDialogOpen(false)}
            />
          </section>
        )}

        {/* You may also like */}
        {(relatedProducts?.length ?? 0) > 0 && (
          <section className="border-t border-[#e8e8e8] pt-16 pb-24">
            <div className="mb-10 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-1.5 text-xs font-medium tracking-[0.14em] text-[#6b6b6b] uppercase">
                  Pair it with
                </p>
                <h2 className="font-serif text-3xl font-semibold tracking-tight">
                  You may also like
                </h2>
              </div>
              <Link
                href="/shop"
                className="inline-flex shrink-0 items-center gap-2 border-b border-current pb-0.5 text-sm font-medium transition-[gap] hover:gap-3"
              >
                All products <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
              {relatedProducts?.map((p, index) => (
                <DefaultProductCard
                  key={p.id}
                  product={p as Product}
                  index={index}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </PageTransition>
  );
}
