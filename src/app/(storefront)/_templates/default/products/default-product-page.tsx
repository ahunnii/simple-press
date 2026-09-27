"use client";

import { useState } from "react";
import Link from "next/link";

import type { DefaultProductPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { GenericTrustBadgeRow } from "~/lib/template-fields";
import type { Product } from "~/types";
import {
  fieldAttr,
  listItemAttr,
  sectionGroupAttr,
} from "~/lib/preview/section-attrs";
import { computeSavingsLabel } from "~/lib/prices";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";
import {
  getListFieldValue,
  isContentEmpty,
  parseTemplateTrustBadgesListRows,
} from "~/lib/template-fields";
import { ANALYTICS_EVENTS } from "~/lib/umami/track";
import { cn } from "~/lib/utils";
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

import {
  DEFAULT_PRODUCT_TRUST_BADGES,
  DEFAULT_PRODUCT_TRUST_BADGES_KEY,
  defaultProductData,
} from ".";
import { DefaultProductCard } from "../shared/default-product-card";
import { DefaultProductActions } from "./default-product-actions";

/**
 * Resolves this page's fields against its own field module rather than the
 * template root's map, so every key resolves to its saved value or its
 * declared default whether or not the root `index.ts` spreads
 * `defaultProductData` yet (the root map would resolve an unknown key to "").
 * Same `resolveTemplateFields` semantics the root `resolveFields` uses.
 */
const PRODUCT_FIELD_MAP = new Map(
  defaultProductData.map((field) => [field.key, field]),
);

const FIELD_KEYS = [
  "default.product.coming-soon-heading",
  "default.product.coming-soon-body",
  "default.product.details-label",
  "default.product.details-empty-text",
  "default.product.shipping-label",
  "default.global.product-shipping-description",
  "default.product.returns-note",
  "default.product.question-label",
  "default.global.product-question-description",
  "default.product.question-link-text",
  "default.product.shipping-note",
  "default.product.reviews-label",
  "default.product.reviews-heading",
  "default.product.related-label",
  "default.product.related-heading",
  "default.product.related-link-text",
];

type StoreBadge = GenericTrustBadgeRow & {
  /** Position in the saved (or built-in) list, for click-to-row targeting. */
  index: number;
};

function AccordionItem({
  summary,
  summaryFieldKey,
  children,
  defaultOpen,
}: {
  summary: string;
  summaryFieldKey: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="group border-b border-[#e8e8e8] py-5 first:border-t"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium select-none [&::-webkit-details-marker]:hidden">
        <span {...fieldAttr(summaryFieldKey)}>{summary}</span>
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
  productPolicies,
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
  const customFields = business?.siteContent?.customFields;
  const f = resolveTemplateFields(customFields, FIELD_KEYS, PRODUCT_FIELD_MAP);
  const detailsLabel = f["default.product.details-label"] ?? "";
  const detailsEmptyText = f["default.product.details-empty-text"] ?? "";
  const shippingLabel = f["default.product.shipping-label"] ?? "";
  const shippingDescription =
    f["default.global.product-shipping-description"] ?? "";
  const returnsNote = f["default.product.returns-note"] ?? "";
  const questionLabel = f["default.product.question-label"] ?? "";
  const questionDescription =
    f["default.global.product-question-description"] ?? "";
  const questionLinkText = f["default.product.question-link-text"] ?? "";
  const shippingNote = f["default.product.shipping-note"] ?? "";
  const reviewsLabel = f["default.product.reviews-label"] ?? "";
  const reviewsHeading = f["default.product.reviews-heading"] ?? "";
  const relatedLabel = f["default.product.related-label"] ?? "";
  const relatedHeading = f["default.product.related-heading"] ?? "";
  const relatedLinkText = f["default.product.related-link-text"] ?? "";
  const hasShippingPolicy = productPolicies?.hasShippingPolicy ?? false;
  const hasRefundPolicy = productPolicies?.hasRefundPolicy ?? false;

  // Store-wide badges come first, then the product's own features (both
  // render). Rows are parsed one at a time so each keeps its position in the
  // saved list for `listItemAttr`; when no saved row is usable the built-in
  // rows show instead — the same fallback rule as
  // `parseTemplateTrustBadgesListRows(raw, DEFAULT_PRODUCT_TRUST_BADGES)`.
  const savedStoreBadges: StoreBadge[] = (
    getListFieldValue(customFields, DEFAULT_PRODUCT_TRUST_BADGES_KEY) ?? []
  ).flatMap((row, index) =>
    (parseTemplateTrustBadgesListRows([row]) ?? []).map((badge) => ({
      ...badge,
      index,
    })),
  );
  const storeBadges: StoreBadge[] =
    savedStoreBadges.length > 0
      ? savedStoreBadges
      : DEFAULT_PRODUCT_TRUST_BADGES.map((badge, index) => ({
          ...badge,
          index,
        }));

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

          {/* Info panel — everything the "Product page details" editor
              section controls (coming-soon copy, badges, accordion, shipping
              line) sits inside this wrapper so its hotspot covers it. Never
              annotate the same group twice. */}
          <div
            className="flex flex-col gap-6"
            {...sectionGroupAttr("product", "details")}
          >
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
            <DefaultProductActions
              product={product}
              business={business}
              comingSoonHeading={f["default.product.coming-soon-heading"] ?? ""}
              comingSoonBody={f["default.product.coming-soon-body"] ?? ""}
            />

            {/* Trust signals */}
            <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-[13px] text-[#6b6b6b]">
              {storeBadges.map(({ icon: Icon, label, index }) => (
                <span
                  key={`store-${index}-${label}`}
                  {...listItemAttr(DEFAULT_PRODUCT_TRUST_BADGES_KEY, index)}
                  className="inline-flex items-center gap-1.5"
                >
                  {Icon ? (
                    <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <span aria-hidden="true">✓</span>
                  )}
                  {label}
                </span>
              ))}
              {displayTrustBadges.map(({ Icon, label }, index) => (
                <span
                  key={`product-${index}-${label}`}
                  className="inline-flex items-center gap-1.5"
                >
                  <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                  {label}
                </span>
              ))}
            </div>

            {/* Accordion */}
            <div className="mt-2">
              {(!isAdditionalEmpty || detailsEmptyText) && (
                <AccordionItem
                  summary={detailsLabel}
                  summaryFieldKey="default.product.details-label"
                  defaultOpen
                >
                  {!isAdditionalEmpty ? (
                    <TiptapRenderer
                      content={
                        additionalFields?.additionalInformation as TiptapJSON
                      }
                      className="prose prose-sm max-w-none"
                    />
                  ) : (
                    <p {...fieldAttr("default.product.details-empty-text")}>
                      {detailsEmptyText}
                    </p>
                  )}
                </AccordionItem>
              )}
              {(shippingDescription || returnsNote) && (
                <AccordionItem
                  summary={shippingLabel}
                  summaryFieldKey="default.product.shipping-label"
                >
                  {shippingDescription && (
                    <p
                      {...fieldAttr(
                        "default.global.product-shipping-description",
                      )}
                    >
                      {shippingDescription}
                    </p>
                  )}
                  {returnsNote && (
                    <p
                      {...fieldAttr("default.product.returns-note")}
                      className={cn(
                        "whitespace-pre-line",
                        shippingDescription && "mt-3",
                      )}
                    >
                      {returnsNote}
                    </p>
                  )}
                  {(hasShippingPolicy || hasRefundPolicy) && (
                    <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                      {hasShippingPolicy && (
                        <Link
                          href="/shipping-policy"
                          className="underline hover:no-underline"
                        >
                          Shipping policy
                        </Link>
                      )}
                      {hasRefundPolicy && (
                        <Link
                          href="/refund-policy"
                          className="underline hover:no-underline"
                        >
                          Returns &amp; refunds policy
                        </Link>
                      )}
                    </p>
                  )}
                </AccordionItem>
              )}

              {questionDescription && (
                <AccordionItem
                  summary={questionLabel}
                  summaryFieldKey="default.product.question-label"
                >
                  <p>
                    <span
                      {...fieldAttr(
                        "default.global.product-question-description",
                      )}
                    >
                      {questionDescription}
                    </span>
                    {questionLinkText && (
                      <>
                        {" "}
                        <Link
                          href="/contact"
                          {...fieldAttr("default.product.question-link-text")}
                          className="underline hover:no-underline"
                        >
                          {questionLinkText}
                        </Link>
                      </>
                    )}
                  </p>
                </AccordionItem>
              )}
            </div>

            {/* Shipping line — links to the shipping policy only when that
                page is published. */}
            {shippingNote &&
              (hasShippingPolicy ? (
                <p className="text-xs text-[#6b6b6b]">
                  <Link
                    href="/shipping-policy"
                    {...fieldAttr("default.product.shipping-note")}
                    className="underline hover:no-underline"
                  >
                    {shippingNote}
                  </Link>
                </p>
              ) : (
                <p
                  {...fieldAttr("default.product.shipping-note")}
                  className="text-xs text-[#6b6b6b]"
                >
                  {shippingNote}
                </p>
              ))}
          </div>
        </div>

        {/* Reviews — only mounts (and only fires review queries) when the
            reviews feature flag is enabled for this business. */}
        {reviewsEnabled && (
          <section className="border-t border-[#e8e8e8] pt-16 pb-24">
            {(reviewsLabel || reviewsHeading) && (
              <div className="mb-10">
                {reviewsLabel && (
                  <p
                    {...fieldAttr("default.product.reviews-label")}
                    className="mb-1.5 text-xs font-medium tracking-[0.14em] text-[#6b6b6b] uppercase"
                  >
                    {reviewsLabel}
                  </p>
                )}
                {reviewsHeading && (
                  <h2
                    {...fieldAttr("default.product.reviews-heading")}
                    className="font-serif text-3xl font-semibold tracking-tight"
                  >
                    {reviewsHeading}
                  </h2>
                )}
              </div>
            )}
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
            {(relatedLabel || relatedHeading || relatedLinkText) && (
              <div className="mb-10 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  {relatedLabel && (
                    <p
                      {...fieldAttr("default.product.related-label")}
                      className="mb-1.5 text-xs font-medium tracking-[0.14em] text-[#6b6b6b] uppercase"
                    >
                      {relatedLabel}
                    </p>
                  )}
                  {relatedHeading && (
                    <h2
                      {...fieldAttr("default.product.related-heading")}
                      className="font-serif text-3xl font-semibold tracking-tight"
                    >
                      {relatedHeading}
                    </h2>
                  )}
                </div>
                {relatedLinkText && (
                  <Link
                    href="/shop"
                    className="inline-flex shrink-0 items-center gap-2 border-b border-current pb-0.5 text-sm font-medium transition-[gap] hover:gap-3"
                  >
                    <span {...fieldAttr("default.product.related-link-text")}>
                      {relatedLinkText}
                    </span>{" "}
                    <span aria-hidden="true">→</span>
                  </Link>
                )}
              </div>
            )}
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
