"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

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
import { ProductDetailsAdditionalInfoTabs } from "~/app/(storefront)/_components/product-page/additional-info-tabs";
import { ProductGalleryHorizontal } from "~/app/(storefront)/_components/product-page/product-gallery-horizontal";

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
  ]);
  const shippingSummary = (f["pollen.product.shipping-summary"] ?? "").trim();
  const returnsSummary = (f["pollen.product.returns-summary"] ?? "").trim();
  const questionText = (f["pollen.product.question-text"] ?? "").trim();
  const relatedHeading = f["pollen.product.related-heading"] ?? "";
  const hasShippingPolicy = productPolicies?.hasShippingPolicy ?? false;
  const hasRefundPolicy = productPolicies?.hasRefundPolicy ?? false;

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

              {/* Shipping / Returns — each row only when its note is set */}
              {shippingSummary || returnsSummary ? (
                <div className="flex flex-col gap-4 rounded-md bg-[#f5f2ee] p-4">
                  <h2 className="sr-only">Shipping and returns</h2>
                  {shippingSummary ? (
                    <div>
                      <h3 className="text-sm font-semibold text-[#2a351f]">
                        Shipping
                      </h3>
                      <p
                        {...fieldAttr("pollen.product.shipping-summary")}
                        className="mt-1 text-sm whitespace-pre-line text-[#4c566a]"
                      >
                        {shippingSummary}
                      </p>
                      {hasShippingPolicy ? (
                        <Link
                          href="/shipping-policy"
                          className="mt-2 inline-block text-sm font-medium text-[#215935] underline underline-offset-4 hover:text-[#1a4729]"
                        >
                          Read the full shipping policy
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                  {returnsSummary ? (
                    <div>
                      <h3 className="text-sm font-semibold text-[#2a351f]">
                        Returns
                      </h3>
                      <p
                        {...fieldAttr("pollen.product.returns-summary")}
                        className="mt-1 text-sm whitespace-pre-line text-[#4c566a]"
                      >
                        {returnsSummary}
                      </p>
                      {hasRefundPolicy ? (
                        <Link
                          href="/refund-policy"
                          className="mt-2 inline-block text-sm font-medium text-[#215935] underline underline-offset-4 hover:text-[#1a4729]"
                        >
                          Read the full returns policy
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
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
