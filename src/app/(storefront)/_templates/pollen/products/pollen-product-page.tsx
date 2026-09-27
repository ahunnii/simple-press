"use client";

import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw, Truck } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import type { Product } from "~/types";
import { buildLucideIconsWithLabels } from "~/lib/lucide-template-icons";
import {
  fieldAttr,
  listItemAttr,
  sectionGroupAttr,
} from "~/lib/preview/section-attrs";
import {
  getListFieldValue,
  parseTemplateTrustBadgesListRows,
} from "~/lib/template-fields";
import { ANALYTICS_EVENTS } from "~/lib/umami/track";
import { api } from "~/trpc/react";
import { useProduct } from "~/hooks/use-product";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { TrackView } from "~/components/analytics/track-view";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";
import { ProductReviews } from "~/components/product-reviews";
import { WriteReviewDialog } from "~/components/write-review-dialog";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { ProductDetailsAdditionalInfoTabs } from "~/app/(storefront)/_components/product-page/additional-info-tabs";
import { ProductGalleryHorizontal } from "~/app/(storefront)/_components/product-page/product-gallery-horizontal";
import { WishlistButton } from "~/app/(storefront)/_components/wishlist/wishlist-button";

import { resolveFields } from "..";
import { PollenProductCard } from "../shared/pollen-product-card";
import { PollenProductActions } from "./pollen-product-actions";

const TRUST_BADGES_KEY = "pollen.product.trust-badges";

export function PollenProductPage({
  product,
  business,
  productPolicies,
}: DefaultProductPageTemplateProps) {
  const {
    formatPrice,
    displayPrice,
    displayCompareAtPrice,
    additionalFields,
    isOnSale,
  } = useProduct(product);

  const customFields = business?.siteContent?.customFields;
  const f = resolveFields(customFields, [
    "pollen.product.shipping-summary",
    "pollen.product.returns-summary",
    "pollen.product.question-text",
    "pollen.product.related-heading",
    "pollen.product.coming-soon-heading",
    "pollen.product.coming-soon-body",
    "pollen.product.reviews-heading",
  ]);
  const shippingSummary = (f["pollen.product.shipping-summary"] ?? "").trim();
  const returnsSummary = (f["pollen.product.returns-summary"] ?? "").trim();
  const questionText = (f["pollen.product.question-text"] ?? "").trim();
  const relatedHeading = f["pollen.product.related-heading"] ?? "";
  const reviewsHeading = f["pollen.product.reviews-heading"] ?? "";
  const hasShippingPolicy = productPolicies?.hasShippingPolicy ?? false;
  const hasRefundPolicy = productPolicies?.hasRefundPolicy ?? false;

  const { isEnabled } = useStorefrontFlags();
  const reviewsEnabled = isEnabled("reviews");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  // A product's own features (Products → features) win; otherwise the
  // store-wide badges from the editor. No built-in fallback rows — an empty
  // list renders no badges at all.
  const productBadges = additionalFields
    ? buildLucideIconsWithLabels(additionalFields)
    : [];
  const storeBadges =
    productBadges.length > 0
      ? []
      : (
          parseTemplateTrustBadgesListRows(
            getListFieldValue(customFields, TRUST_BADGES_KEY),
          ) ?? []
        )
          .map((row, index) => ({
            Icon: row.icon,
            label: row.label.trim(),
            index,
          }))
          .filter((row) => row.label.length > 0);

  const { data: relatedProducts } = api.product.getRelated.useQuery({
    productId: product.id,
  });
  const hasRelatedProducts = (relatedProducts?.length ?? 0) > 0;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [product.slug]);

  return (
    <PageTransition>
      <TrackView
        event={ANALYTICS_EVENTS.PRODUCT_VIEW}
        data={{ productId: product.id }}
      />
      <section className="mx-auto mt-28 max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <FadeIn direction="none" duration={0.3}>
          {/* N-1: aria-hidden on decorative ArrowLeft icon */}
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="mb-6 gap-1 text-[#4c566a] hover:text-[#215935]"
          >
            <Link href="/shop">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to Shop
            </Link>
          </Button>
        </FadeIn>

        <div className="flex flex-col gap-10 lg:flex-row lg:gap-16">
          {/* Image Gallery */}
          <FadeIn direction="left" className="flex-1">
            <ProductGalleryHorizontal
              images={product.images}
              enableLightbox={true}
              productName={product.name}
              styleProps={{
                singleImageContainerClassName: "rounded-md",
              }}
            />
          </FadeIn>

          {/* Details */}
          <FadeIn
            direction="right"
            delay={0.15}
            className="flex flex-1 flex-col gap-6"
          >
            <div>
              <h1 className="text-3xl font-bold text-[#2a351f] md:text-4xl">
                {product.name}
              </h1>
              {additionalFields?.productTagline && (
                <p className="mt-1 text-lg font-medium text-[#5e7747]">
                  {additionalFields.productTagline}
                </p>
              )}
            </div>

            {/* Price */}
            <div className="flex flex-wrap items-baseline gap-3">
              {isOnSale && displayCompareAtPrice && (
                <span className="inline-flex items-center rounded-full bg-[#215935] px-3 py-1 text-sm font-semibold text-white">
                  Sale
                </span>
              )}
              <span className="text-3xl font-bold text-[#215935]">
                {formatPrice(displayPrice)}
              </span>
              {isOnSale && displayCompareAtPrice && (
                <span className="text-xl text-[#4c566a] line-through">
                  {formatPrice(displayCompareAtPrice)}
                </span>
              )}
            </div>

            <Separator />

            {/* Buy panel — everything the "Product page" editor section
                controls sits inside this wrapper so its hotspot covers it. */}
            <div
              {...sectionGroupAttr("product", "details")}
              className="flex flex-col gap-6"
            >
              {/* Wishlist — kept as its own row above the buy panel so it
                  stays visible across every PollenProductActions branch
                  (coming soon, variants, out of stock, in stock), the same
                  way the shop card's heart is never hidden by stock status.
                  Self-gates on the wishlist flag (renders nothing when off). */}
              <WishlistButton
                item={{
                  productId: product.id,
                  name: product.name,
                  slug: product.slug,
                  price: displayPrice,
                  imageUrl: product.images[0]?.url ?? null,
                }}
                className="static flex size-10 shrink-0 items-center justify-center self-start rounded-md border border-[#2a351f]/20 bg-white text-[#215935] shadow-none backdrop-blur-none hover:scale-100 hover:bg-[#f5f2ee]"
                iconClassName="size-4"
              />

              <PollenProductActions
                product={product}
                business={business}
                comingSoonHeading={
                  f["pollen.product.coming-soon-heading"] ?? ""
                }
                comingSoonBody={f["pollen.product.coming-soon-body"] ?? ""}
              />

              {/* Trust / feature badges */}
              {productBadges.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {productBadges.map((badge, i) => (
                    <div
                      key={`${badge.label}-${i}`}
                      className="flex items-center gap-2 rounded-md bg-[#f5f2ee] px-3 py-2"
                    >
                      <badge.Icon
                        className="size-4 text-[#215935]"
                        aria-hidden="true"
                      />
                      <span className="text-xs font-medium text-[#2a351f]">
                        {badge.label}
                      </span>
                    </div>
                  ))}
                </div>
              ) : storeBadges.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {storeBadges.map((badge) => (
                    <div
                      key={badge.index}
                      {...listItemAttr(TRUST_BADGES_KEY, badge.index)}
                      className="flex items-center gap-2 rounded-md bg-[#f5f2ee] px-3 py-2"
                    >
                      {badge.Icon ? (
                        <badge.Icon
                          className="size-4 text-[#215935]"
                          aria-hidden="true"
                        />
                      ) : null}
                      <span className="text-xs font-medium text-[#2a351f]">
                        {badge.label}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Shipping / Returns — each row renders when its note is set OR its policy is published */}
              {shippingSummary ||
              returnsSummary ||
              hasShippingPolicy ||
              hasRefundPolicy ? (
                <div>
                  <h2 className="sr-only">Shipping and returns</h2>
                  <div className="divide-y divide-[#e5ded4] rounded-md bg-[#f5f2ee]">
                    {shippingSummary || hasShippingPolicy ? (
                      <PolicyNote
                        Icon={Truck}
                        title="Shipping"
                        fieldKey="pollen.product.shipping-summary"
                        note={shippingSummary}
                        policyHref={
                          hasShippingPolicy ? "/shipping-policy" : undefined
                        }
                        policyLabel="Read the full shipping policy"
                      />
                    ) : null}
                    {returnsSummary || hasRefundPolicy ? (
                      <PolicyNote
                        Icon={RotateCcw}
                        title="Returns"
                        fieldKey="pollen.product.returns-summary"
                        note={returnsSummary}
                        policyHref={
                          hasRefundPolicy ? "/refund-policy" : undefined
                        }
                        policyLabel="Read the full returns policy"
                      />
                    ) : null}
                  </div>
                </div>
              ) : null}

              {questionText ? (
                <p className="text-sm">
                  <Link
                    href="/contact"
                    {...fieldAttr("pollen.product.question-text")}
                    className="font-medium text-[#215935] underline underline-offset-4 hover:text-[#1a4729]"
                  >
                    {questionText}
                  </Link>
                </p>
              ) : null}
            </div>
          </FadeIn>
        </div>

        {/* Additional Information */}
        <ProductDetailsAdditionalInfoTabs
          product={product}
          includeCard={false}
          styleProps={{
            contentClassName:
              "whitespace-pre-line text-lg leading-relaxed text-[#4c566a]",
            tipTapRendererClassName:
              "whitespace-pre-line text-lg leading-relaxed text-[#4c566a]",
          }}
        />

        {/* Reviews — only mounts (and only fires review queries) when the
            reviews feature flag is enabled for this business. */}
        {reviewsEnabled ? (
          <FadeIn direction="up">
            <section
              aria-label="Reviews"
              className="mt-4 mb-20 border-t border-[#2a351f]/10 pt-16"
            >
              {reviewsHeading ? (
                <h2
                  {...fieldAttr("pollen.product.reviews-heading")}
                  className="text-2xl font-bold tracking-wide text-[#2a351f] uppercase"
                >
                  {reviewsHeading}
                </h2>
              ) : null}
              <div className="mt-8">
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
            </section>
          </FadeIn>
        ) : null}

        {/* Related Products — the whole block (heading included) only
            renders when there is something to show. */}
        {hasRelatedProducts ? (
          <div className="mb-20">
            <FadeIn direction="up">
              <h2
                {...fieldAttr("pollen.product.related-heading")}
                className="text-2xl font-bold tracking-wide text-[#2a351f] uppercase"
              >
                {relatedHeading}
              </h2>
            </FadeIn>
            <StaggerContainer
              className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
              staggerDelay={0.12}
            >
              {relatedProducts?.map((p, i) => (
                <StaggerItem key={p.id}>
                  <PollenProductCard product={p as Product} index={i} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        ) : null}
      </section>
    </PageTransition>
  );
}

/** One Shipping / Returns row: optional owner note plus a policy link when that page is published. */
function PolicyNote({
  Icon,
  title,
  fieldKey,
  note,
  policyHref,
  policyLabel,
}: {
  Icon: LucideIcon;
  title: string;
  fieldKey: string;
  note?: string;
  /** Only set when the matching policy page is published. */
  policyHref: string | undefined;
  policyLabel: string;
}) {
  return (
    <div className="flex gap-3 px-4 py-3">
      <Icon
        className="mt-0.5 size-4 shrink-0 text-[#215935]"
        aria-hidden="true"
      />
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-[#2a351f]">{title}</h3>
        {note ? (
          <p
            {...fieldAttr(fieldKey)}
            className="mt-1 text-sm leading-relaxed whitespace-pre-line text-[#4c566a]"
          >
            {note}
          </p>
        ) : null}
        {policyHref ? (
          <Link
            href={policyHref}
            className="mt-2 inline-block text-sm font-medium text-[#215935] underline underline-offset-4 hover:text-[#1a4729]"
          >
            {policyLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
