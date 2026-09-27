"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import type { DefaultProductPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { Product } from "~/types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { computeSavingsLabel } from "~/lib/prices";
import { isContentEmpty } from "~/lib/template-fields";
import { ANALYTICS_EVENTS } from "~/lib/umami/track";
import { api } from "~/trpc/react";
import { useProduct } from "~/hooks/use-product";
import { TrackView } from "~/components/analytics/track-view";
import { ProductReviews } from "~/components/product-reviews";
import { TiptapRenderer } from "~/components/tiptap-renderer";
import { WriteReviewDialog } from "~/components/write-review-dialog";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { ProductGalleryHorizontal } from "~/app/(storefront)/_components/product-page/product-gallery-horizontal";
import { WishlistButton } from "~/app/(storefront)/_components/wishlist/wishlist-button";

import { DREAM_PROSE_CLASSNAME } from "../generic/dream-generic-page";
import { DreamHeading } from "../shared/dream-heading";
import { DreamPhoto } from "../shared/dream-photo";
import { DreamReveal } from "../shared/dream-reveal";
import { DreamSection } from "../shared/dream-section";
import { resolveDreamProductFields } from ".";
import { DreamProductActions } from "./dream-product-actions";
import { DreamRelatedCard } from "./dream-related-card";

const FIELD_KEYS = [
  "dream.product.shipping-note",
  "dream.product.returns-note",
  "dream.product.question-text",
  "dream.product.related-heading",
  "dream.product.coming-soon-heading",
  "dream.product.coming-soon-body",
];

/** Italiana section heading at h3 scale — for the page's quieter h2s. */
const SMALL_H2 = "text-[clamp(26px,2.6vw,34px)] leading-[1.1]";

/** One shipping/returns row: small Italiana heading, note, optional policy link. */
function PolicyNote({
  title,
  fieldKey,
  note,
  policyHref,
  policyLabel,
}: {
  title: string;
  fieldKey: string;
  note: string;
  /** Only passed when the matching policy page is published. */
  policyHref?: string;
  policyLabel: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 py-4">
      <h2 className="text-[22px] leading-[1.2]">{title}</h2>
      <p
        {...fieldAttr(fieldKey)}
        className="max-w-[60ch] text-[15px] leading-[1.65] whitespace-pre-line text-[var(--dream-soft)]"
      >
        {note}
      </p>
      {policyHref ? (
        <Link href={policyHref} className="dream-link self-start text-[15px]">
          {policyLabel}
        </Link>
      ) : null}
    </div>
  );
}

/**
 * Product page — not in design.md's original scope (commerce slots fell back
 * to Default), styled 2026-09-26 in the Operate register: one sky → paper
 * band holding a hairline-framed gallery beside the buy column, then quiet
 * paper sections for details, reviews (flag-gated) and related products.
 *
 * Dream's chrome has no cart icon or drawer, so `DreamProductActions`
 * confirms an add inline with a link to `/cart` (Default CartPage).
 *
 * The `.dream-embed` bridge on the root maps shadcn vars onto dream tokens
 * so the shared gallery, notify-me form, subscribe panel and reviews read
 * on-brand without per-widget overrides.
 */
export function DreamProductPage({
  product,
  business,
  productPolicies,
}: DefaultProductPageTemplateProps) {
  const state = useProduct(product);
  const {
    formatPrice,
    displayPrice,
    displayCompareAtPrice,
    additionalFields,
    isOnSale,
  } = state;

  const customFields = business?.siteContent?.customFields;
  const f = resolveDreamProductFields(customFields, FIELD_KEYS);
  const shippingNote = (f["dream.product.shipping-note"] ?? "").trim();
  const returnsNote = (f["dream.product.returns-note"] ?? "").trim();
  const questionText = (f["dream.product.question-text"] ?? "").trim();
  const relatedHeading = (f["dream.product.related-heading"] ?? "").trim();
  const hasShippingPolicy = productPolicies?.hasShippingPolicy ?? false;
  const hasRefundPolicy = productPolicies?.hasRefundPolicy ?? false;

  const { isEnabled } = useStorefrontFlags();
  const reviewsEnabled = isEnabled("reviews");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  const { data: relatedProducts } = api.product.getRelated.useQuery({
    productId: product.id,
  });
  const related = (relatedProducts ?? []) as Product[];

  const additionalInformation =
    additionalFields?.additionalInformation as TiptapJSON | undefined;
  const details =
    additionalInformation && !isContentEmpty(additionalInformation)
      ? additionalInformation
      : null;
  const hasDetails = details !== null;
  const description = product.description?.trim() ?? "";

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [product.slug]);

  return (
    <div className="dream-embed">
      <TrackView
        event={ANALYTICS_EVENTS.PRODUCT_VIEW}
        data={{ productId: product.id }}
      />

      <section
        aria-label={product.name}
        className="border-b border-[var(--dream-line)] pt-6 pb-16 sm:pb-20"
        style={{
          background:
            "linear-gradient(180deg, var(--dream-sky) 0%, var(--dream-paper) 100%)",
        }}
      >
        <div className="mx-auto w-full [max-width:var(--dream-container)] px-[var(--dream-gutter)]">
          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="m-0 flex list-none flex-wrap items-center p-0 text-[14px] text-[var(--dream-soft)]">
              <li>
                <Link href="/" className="dream-link">
                  Home
                </Link>
              </li>
              <li aria-hidden="true" className="mx-2">
                /
              </li>
              <li>
                <Link href="/shop" className="dream-link">
                  Shop
                </Link>
              </li>
              <li aria-hidden="true" className="mx-2">
                /
              </li>
              <li aria-current="page" className="text-[var(--dream-ink)]">
                {product.name}
              </li>
            </ol>
          </nav>

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
            {/* Gallery */}
            <DreamReveal className="min-w-0 lg:sticky lg:top-[calc(var(--dream-header-h)+24px)] lg:self-start">
              {product.images.length > 0 ? (
                <ProductGalleryHorizontal
                  images={product.images}
                  productName={product.name}
                  enableLightbox
                  styleProps={{
                    singleImageContainerClassName:
                      "aspect-[4/5] rounded-[var(--dream-radius-photo)] border border-[var(--dream-line)] bg-[var(--dream-sky)]",
                    selectedButtonClassName:
                      "rounded-[var(--dream-radius-input)]",
                    unselectedButtonClassName:
                      "rounded-[var(--dream-radius-input)]",
                  }}
                />
              ) : (
                <DreamPhoto
                  src=""
                  alt=""
                  aspect="4 / 5"
                  fallbackTone="sky"
                  priority
                />
              )}
            </DreamReveal>

            {/* Buy column */}
            <div className="flex min-w-0 flex-col gap-6">
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-4">
                  <h1
                    className="dream-h1"
                    style={{
                      fontSize: "clamp(36px, 4.4vw, 54px)",
                      lineHeight: 1.06,
                    }}
                  >
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
                    className="mt-2 shrink-0 rounded-full border border-[var(--dream-line)] bg-[var(--dream-paper)] text-[var(--dream-ink)]"
                  />
                </div>
                {additionalFields?.productTagline ? (
                  <p className="text-[18px] text-[var(--dream-soft)]">
                    {additionalFields.productTagline}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[24px] font-medium text-[var(--dream-ink)] tabular-nums">
                    {formatPrice(displayPrice)}
                  </span>
                  {isOnSale && displayCompareAtPrice ? (
                    <>
                      <span className="text-[18px] text-[var(--dream-soft)] line-through tabular-nums">
                        <span className="sr-only">Original price: </span>
                        {formatPrice(displayCompareAtPrice)}
                      </span>
                      <span className="inline-flex items-center rounded-[var(--dream-radius-pill)] bg-[var(--dream-gold-soft)] px-3 py-1 text-[13px] font-semibold text-[var(--dream-ink)]">
                        {computeSavingsLabel(
                          displayPrice,
                          displayCompareAtPrice,
                        )}
                      </span>
                    </>
                  ) : null}
                </div>
              </div>

              {description ? (
                <p className="max-w-[60ch] text-[17px] leading-[1.7] whitespace-pre-line text-[var(--dream-soft)]">
                  {description}
                </p>
              ) : null}

              <hr className="m-0 border-0 border-t border-[var(--dream-line)]" />

              {/* Buy panel — everything the "Product page" editor section
                  controls sits inside this wrapper so its hotspot covers it. */}
              <div
                {...sectionGroupAttr("product", "details")}
                className="flex flex-col gap-5"
              >
                <DreamProductActions
                  product={product}
                  state={state}
                  comingSoonHeading={
                    f["dream.product.coming-soon-heading"] ?? ""
                  }
                  comingSoonBody={f["dream.product.coming-soon-body"] ?? ""}
                />

                {shippingNote || returnsNote ? (
                  <div className="flex flex-col divide-y divide-[var(--dream-line)] border-y border-[var(--dream-line)]">
                    {shippingNote ? (
                      <PolicyNote
                        title="Shipping"
                        fieldKey="dream.product.shipping-note"
                        note={shippingNote}
                        policyHref={
                          hasShippingPolicy ? "/shipping-policy" : undefined
                        }
                        policyLabel="Read our shipping policy"
                      />
                    ) : null}
                    {returnsNote ? (
                      <PolicyNote
                        title="Returns"
                        fieldKey="dream.product.returns-note"
                        note={returnsNote}
                        policyHref={
                          hasRefundPolicy ? "/refund-policy" : undefined
                        }
                        policyLabel="Read our returns policy"
                      />
                    ) : null}
                  </div>
                ) : null}

                {questionText ? (
                  <p className="text-[15px]">
                    <Link
                      href="/contact"
                      {...fieldAttr("dream.product.question-text")}
                      className="dream-link"
                    >
                      {questionText}
                    </Link>
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      {details ? (
        <DreamSection aria-label="Details">
          <h2 className={SMALL_H2}>Details</h2>
          <TiptapRenderer
            content={details}
            className={DREAM_PROSE_CLASSNAME}
          />
        </DreamSection>
      ) : null}

      {/* Reviews — only mounts (and only fires review queries) when the
          reviews feature flag is on for this business. */}
      {reviewsEnabled ? (
        <DreamSection
          aria-label="Reviews"
          className={hasDetails ? "border-t border-[var(--dream-line)]" : ""}
        >
          <h2 className={`${SMALL_H2} mb-8`}>Reviews</h2>
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
        </DreamSection>
      ) : null}

      {/* Related — the whole block (heading included) only renders when
          there is something to show. */}
      {related.length > 0 ? (
        <DreamSection
          tone="sky"
          aria-label={relatedHeading ? undefined : "Related products"}
        >
          {relatedHeading ? (
            <DreamHeading
              as="h2"
              fieldKey="dream.product.related-heading"
              className="mb-10 text-center"
            >
              {relatedHeading}
            </DreamHeading>
          ) : null}
          <ul className="m-0 grid list-none grid-cols-2 gap-x-5 gap-y-10 p-0 lg:grid-cols-4">
            {related.map((p) => (
              <li key={p.id}>
                <DreamRelatedCard product={p} />
              </li>
            ))}
          </ul>
        </DreamSection>
      ) : null}
    </div>
  );
}
