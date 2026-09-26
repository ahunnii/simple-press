"use client";

import type { LucideIcon } from "lucide-react";
import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw, Truck } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import type { Product } from "~/types";
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

import { resolveFields } from "../index";
import { HappyBambooProductCard } from "../shared/happy-bamboo-product-card";
import { HappyBambooProductActions } from "./happy-bamboo-product-actions";

const TRUST_BADGES_KEY = "happy-bamboo.product.trust-badges";

type StoreBadge = {
  Icon: LucideIcon | undefined;
  label: string;
  /** Position in the saved list, for the editor's click-to-row targeting. */
  index: number;
};

export function HappyBambooProductPage({
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
    displayTrustBadges,
  } = useProduct(product);

  // `business` carries the visual editor's preview draft; the product's own
  // business relation is the fallback for any caller that omits it.
  const customFields =
    business?.siteContent?.customFields ??
    product.business?.siteContent?.customFields;
  const fields = resolveFields(customFields, [
    "happy-bamboo.sale-badge-format",
    "happy-bamboo.product.shipping-summary",
    "happy-bamboo.product.returns-summary",
    "happy-bamboo.product.question-text",
    "happy-bamboo.product.related-heading",
    "happy-bamboo.product.coming-soon-heading",
    "happy-bamboo.product.coming-soon-body",
  ]);
  const saleBadgeFormat = fields["happy-bamboo.sale-badge-format"] ?? "true";
  const shippingSummary = (
    fields["happy-bamboo.product.shipping-summary"] ?? ""
  ).trim();
  const returnsSummary = (
    fields["happy-bamboo.product.returns-summary"] ?? ""
  ).trim();
  const questionText = (
    fields["happy-bamboo.product.question-text"] ?? ""
  ).trim();
  const relatedHeading = fields["happy-bamboo.product.related-heading"] ?? "";
  const hasShippingPolicy = productPolicies?.hasShippingPolicy ?? false;
  const hasRefundPolicy = productPolicies?.hasRefundPolicy ?? false;

  // A product's own features (Products → features) win; otherwise the
  // store-wide badges from the editor. No built-in fallback rows — an empty
  // list renders no badges at all.
  const storeBadges: StoreBadge[] =
    displayTrustBadges.length > 0
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
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to Shop
            </Link>
          </Button>
        </FadeIn>

        {/* Product Main */}
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-16">
          {/* Image Gallery */}
          <FadeIn direction="left" className="flex-1">
            <ProductGalleryHorizontal
              images={product.images}
              productName={product.name}
              enableLightbox={true}
              mainImageFit="contain"
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
                <p className="text-muted-foreground mt-1 text-xl font-medium">
                  {additionalFields.productTagline}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              {isOnSale && displayCompareAtPrice && (
                <span className="inline-flex items-center rounded-full bg-black px-3 py-1 text-sm font-semibold text-white">
                  {computeSavingsLabel(
                    displayPrice,
                    displayCompareAtPrice,
                    saleBadgeFormat,
                  )}
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
            </div>

            <Separator />

            {/* Buy panel — everything the "Product page" editor section
                controls sits inside this wrapper so its hotspot covers it. */}
            <div
              {...sectionGroupAttr("product", "details")}
              className="flex flex-col gap-6"
            >
              {/* Quantity + Add to Cart Actions */}
              <HappyBambooProductActions
                product={product}
                business={business}
                comingSoonHeading={
                  fields["happy-bamboo.product.coming-soon-heading"] ?? ""
                }
                comingSoonBody={
                  fields["happy-bamboo.product.coming-soon-body"] ?? ""
                }
              />

              {/* Trust / Feature badges */}
              {displayTrustBadges.length > 0 ? (
                <ul className="grid grid-cols-2 gap-3">
                  {displayTrustBadges.map((badge, i) => (
                    <li
                      key={`${badge.label}-${i}`}
                      className="bg-secondary/60 flex items-center gap-2 rounded-lg px-3 py-2"
                    >
                      <badge.Icon
                        className="text-primary size-4 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="text-secondary-foreground text-xs font-medium">
                        {badge.label}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : storeBadges.length > 0 ? (
                <ul className="grid grid-cols-2 gap-3">
                  {storeBadges.map((badge) => (
                    <li
                      key={badge.index}
                      {...listItemAttr(TRUST_BADGES_KEY, badge.index)}
                      className="bg-secondary/60 flex items-center gap-2 rounded-lg px-3 py-2"
                    >
                      {badge.Icon ? (
                        <badge.Icon
                          className="text-primary size-4 shrink-0"
                          aria-hidden="true"
                        />
                      ) : null}
                      <span className="text-secondary-foreground text-xs font-medium">
                        {badge.label}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {/* Shipping / Returns — each row renders when its note is set OR its policy is published */}
              {shippingSummary || returnsSummary || hasShippingPolicy || hasRefundPolicy ? (
                <div>
                  <h2 className="sr-only">Shipping and returns</h2>
                  <div className="border-border divide-border divide-y rounded-lg border">
                    {shippingSummary || hasShippingPolicy ? (
                      <PolicyNote
                        Icon={Truck}
                        title="Shipping"
                        fieldKey="happy-bamboo.product.shipping-summary"
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
                        fieldKey="happy-bamboo.product.returns-summary"
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
                    {...fieldAttr("happy-bamboo.product.question-text")}
                    className="text-primary font-medium underline underline-offset-4 hover:text-[var(--hb-brand-deep)]"
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
          styleProps={{
            cardContentClassName:
              "text-muted-foreground mt-3 text-lg leading-relaxed whitespace-pre-line",
            tipTapRendererClassName:
              "text-muted-foreground mt-3 text-lg leading-relaxed whitespace-pre-line ",
          }}
        />

        {/* Related Products — the whole block (heading included) only
            renders when there is something to show. */}
        {hasRelatedProducts ? (
          <section aria-labelledby="hb-related-heading" className="mb-20">
            <FadeIn direction="up">
              <h2
                id="hb-related-heading"
                {...fieldAttr("happy-bamboo.product.related-heading")}
                className="text-foreground font-heading text-2xl font-bold"
              >
                {relatedHeading}
              </h2>
            </FadeIn>
            <StaggerContainer
              className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2"
              staggerDelay={0.12}
            >
              {relatedProducts?.map((p, index) => {
                return (
                  <StaggerItem key={p.id}>
                    <HappyBambooProductCard
                      product={p as Product}
                      saleBadgeFormat={saleBadgeFormat}
                      index={index}
                    />
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          </section>
        ) : null}
      </section>
    </PageTransition>
  );
}

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
        className="text-primary mt-0.5 size-4 shrink-0"
        aria-hidden="true"
      />
      <div className="min-w-0">
        <h3 className="text-foreground text-sm font-semibold">{title}</h3>
        {note ? (
          <p
            {...fieldAttr(fieldKey)}
            className="text-muted-foreground mt-1 text-sm leading-relaxed whitespace-pre-line"
          >
            {note}
          </p>
        ) : null}
        {policyHref ? (
          <Link
            href={policyHref}
            className="text-primary mt-2 inline-block text-sm font-medium underline underline-offset-4 hover:text-[var(--hb-brand-deep)]"
          >
            {policyLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
