"use client";

import type { LucideIcon } from "lucide-react";
import { useEffect } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import type { Product } from "~/types";
import { buildLucideIconsWithLabels } from "~/lib/lucide-template-icons";
import {
  fieldAttr,
  listItemAttr,
  sectionGroupAttr,
} from "~/lib/preview/section-attrs";
import { computeSavingsLabel } from "~/lib/prices";
import {
  getListFieldValue,
  parseTemplateTrustBadgesListRows,
} from "~/lib/template-fields";
import { ANALYTICS_EVENTS } from "~/lib/umami/track";
import { api } from "~/trpc/react";
import { useProduct } from "~/hooks/use-product";
import { Spotlight } from "~/components/ui/spotlight-new";
import { TrackView } from "~/components/analytics/track-view";
import { ProductGalleryHorizontal } from "~/app/(storefront)/_components/product-page/product-gallery-horizontal";

import { resolveFields } from "..";
import { DarkTrendProductCard } from "../shared/dark-trend-product-card";
import { DarkTrendProductActions } from "./dark-trend-product-actions";
import { DarkTrendProductDetails } from "./dark-trend-product-details";

const TRUST_BADGES_KEY = "dark-trend.product.trust-badges";

type StoreBadge = {
  Icon: LucideIcon | undefined;
  label: string;
  /** Position in the saved list, for the editor's click-to-row targeting. */
  index: number;
};

const POLICY_LINK_CLASS =
  "mt-2 inline-block text-sm font-medium text-purple-400 underline underline-offset-4 transition-colors hover:text-purple-300";

export function DarkTrendProductPage({
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
  } = useProduct(product);

  const { data: relatedProducts } = api.product.getRelated.useQuery({
    productId: product.id,
  });

  const customFields = business?.siteContent?.customFields;
  const f = resolveFields(customFields, [
    "dark-trend.product.shipping-summary",
    "dark-trend.product.returns-summary",
    "dark-trend.product.question-text",
    "dark-trend.product.related-heading",
    "dark-trend.product.coming-soon-heading",
    "dark-trend.product.coming-soon-body",
  ]);
  const shippingSummary = (
    f["dark-trend.product.shipping-summary"] ?? ""
  ).trim();
  const returnsSummary = (f["dark-trend.product.returns-summary"] ?? "").trim();
  const questionText = (f["dark-trend.product.question-text"] ?? "").trim();
  const relatedHeading = f["dark-trend.product.related-heading"] ?? "";
  const hasShippingPolicy = productPolicies?.hasShippingPolicy ?? false;
  const hasRefundPolicy = productPolicies?.hasRefundPolicy ?? false;
  const hasRelatedProducts = (relatedProducts?.length ?? 0) > 0;

  // A product's own features (Products → features) win; otherwise the
  // store-wide badges from the editor. No built-in fallback rows — an empty
  // list renders no badges at all.
  const trustBadges =
    !!additionalFields?.productFeatures &&
    additionalFields?.productFeatures?.length > 0
      ? buildLucideIconsWithLabels(additionalFields)
      : [];
  const storeBadges: StoreBadge[] =
    trustBadges.length > 0
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

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [product.slug]);

  return (
    <div className="relative min-h-screen overflow-x-hidden pt-16 pb-20">
      <TrackView
        event={ANALYTICS_EVENTS.PRODUCT_VIEW}
        data={{ productId: product.id }}
      />
      <Spotlight />
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {/* Back Link */}
        <Link
          href="/shop"
          className="text-muted-foreground hover:text-foreground mb-8 inline-flex items-center gap-2 text-sm transition-colors"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Back to Shop
        </Link>

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Product Image + Gallery */}
          <ProductGalleryHorizontal
            images={product.images}
            productName={product.name}
            enableLightbox={true}
          />
          {/* Product Info */}
          <div className="flex flex-col">
            {/* Header */}
            <div className="mb-8">
              <span className="mb-2 block text-sm font-semibold tracking-[0.2em] text-purple-400 uppercase">
                {additionalFields?.productTagline?.trim() !== ""
                  ? additionalFields?.productTagline
                  : "Product"}
              </span>
              <h1 className="mb-3 text-4xl font-bold tracking-tight md:text-5xl">
                {product.name}
              </h1>
            </div>

            {/* Price */}
            <div className="mb-8 flex items-center gap-3">
              {isOnSale && displayCompareAtPrice && (
                <span className="bg-primary inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold">
                  {computeSavingsLabel(displayPrice, displayCompareAtPrice)}
                </span>
              )}

              <div className="flex items-baseline gap-2">
                <span className="text-foreground text-3xl font-semibold">
                  {formatPrice(displayPrice)}
                </span>
                {isOnSale && displayCompareAtPrice && (
                  <span className="text-muted-foreground text-xl line-through">
                    {formatPrice(displayCompareAtPrice)}
                  </span>
                )}
              </div>
            </div>

            {/* Buy panel — everything the "Product page" editor section
                controls sits inside this wrapper so its hotspot covers it. */}
            <div {...sectionGroupAttr("product", "details")}>
              {/* Quantity + Add to Cart Actions*/}
              <DarkTrendProductActions
                product={product}
                business={business}
                comingSoonHeading={
                  f["dark-trend.product.coming-soon-heading"] ?? ""
                }
                comingSoonBody={f["dark-trend.product.coming-soon-body"] ?? ""}
              />

              {/* Trust / Feature badges */}
              {trustBadges.length > 0 ? (
                <ul className="mt-8 flex flex-wrap gap-4 border-t border-white/10 pt-8">
                  {trustBadges.map((badge, i) => (
                    <li
                      key={`${badge.label}-${i}`}
                      className="flex items-center gap-2 text-sm text-white/60"
                    >
                      <badge.Icon
                        className="h-4 w-4 text-purple-400"
                        aria-hidden="true"
                      />
                      <span>{badge.label}</span>
                    </li>
                  ))}
                </ul>
              ) : storeBadges.length > 0 ? (
                <ul className="mt-8 flex flex-wrap gap-4 border-t border-white/10 pt-8">
                  {storeBadges.map((badge) => (
                    <li
                      key={badge.index}
                      {...listItemAttr(TRUST_BADGES_KEY, badge.index)}
                      className="flex items-center gap-2 text-sm text-white/60"
                    >
                      {badge.Icon ? (
                        <badge.Icon
                          className="h-4 w-4 text-purple-400"
                          aria-hidden="true"
                        />
                      ) : null}
                      <span>{badge.label}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {/* Shipping / Returns — each row only when its note is set */}
              {shippingSummary || returnsSummary ? (
                <div className="mt-8">
                  <h2 className="sr-only">Shipping and returns</h2>
                  <dl className="divide-y divide-white/10 border-y border-white/10">
                    {shippingSummary ? (
                      <div className="grid gap-2 py-5 sm:grid-cols-[7rem_1fr] sm:gap-6">
                        <dt className="font-mono text-xs tracking-[0.2em] text-purple-400 uppercase sm:pt-0.5">
                          Shipping
                        </dt>
                        <dd>
                          <p
                            {...fieldAttr(
                              "dark-trend.product.shipping-summary",
                            )}
                            className="text-sm leading-relaxed whitespace-pre-line text-white/70"
                          >
                            {shippingSummary}
                          </p>
                          {hasShippingPolicy ? (
                            <Link
                              href="/shipping-policy"
                              className={POLICY_LINK_CLASS}
                            >
                              Read the full shipping policy
                            </Link>
                          ) : null}
                        </dd>
                      </div>
                    ) : null}
                    {returnsSummary ? (
                      <div className="grid gap-2 py-5 sm:grid-cols-[7rem_1fr] sm:gap-6">
                        <dt className="font-mono text-xs tracking-[0.2em] text-purple-400 uppercase sm:pt-0.5">
                          Returns
                        </dt>
                        <dd>
                          <p
                            {...fieldAttr("dark-trend.product.returns-summary")}
                            className="text-sm leading-relaxed whitespace-pre-line text-white/70"
                          >
                            {returnsSummary}
                          </p>
                          {hasRefundPolicy ? (
                            <Link
                              href="/refund-policy"
                              className={POLICY_LINK_CLASS}
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
                    {...fieldAttr("dark-trend.product.question-text")}
                    className="font-medium text-purple-400 underline underline-offset-4 transition-colors hover:text-purple-300"
                  >
                    {questionText}
                  </Link>
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <DarkTrendProductDetails product={product} />
      </div>

      {/* Related Products — the whole block (heading included) only
          renders when there is something to show. */}
      {hasRelatedProducts ? (
        <section
          aria-labelledby="dark-trend-related-heading"
          className="mx-auto max-w-7xl px-6 pb-20 lg:px-8"
        >
          <div className="mb-10 flex items-baseline gap-4">
            <h2
              id="dark-trend-related-heading"
              {...fieldAttr("dark-trend.product.related-heading")}
              className="text-2xl font-bold tracking-tight md:text-3xl"
            >
              {relatedHeading}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {relatedProducts?.map((p, i) => (
              <DarkTrendProductCard
                key={p.id}
                product={p as Product}
                index={i}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
