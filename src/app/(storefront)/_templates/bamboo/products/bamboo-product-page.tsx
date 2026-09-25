"use client";

import type { LucideIcon } from "lucide-react";
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

import { resolveFields } from "..";
import {
  BambooAccordion,
  BambooAccordionItem,
} from "../shared/bamboo-accordion";
import { BambooHorizontalProductCard } from "../shared/bamboo-product-card";
import { BambooProductActions } from "./bamboo-product-actions";

const TRUST_BADGES_KEY = "bamboo.product.trust-badges";

type StoreBadge = {
  Icon: LucideIcon | undefined;
  label: string;
  /** Position in the saved list, for the editor's click-to-row targeting. */
  index: number;
};

export function BambooProductPage({
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
    "bamboo.product.shipping-summary",
    "bamboo.product.returns-summary",
    "bamboo.product.question-text",
    "bamboo.product.related-heading",
    "bamboo.product.coming-soon-heading",
    "bamboo.product.coming-soon-body",
  ]);
  const shippingSummary = (f["bamboo.product.shipping-summary"] ?? "").trim();
  const returnsSummary = (f["bamboo.product.returns-summary"] ?? "").trim();
  const questionText = (f["bamboo.product.question-text"] ?? "").trim();
  const relatedHeading = f["bamboo.product.related-heading"] ?? "";
  const hasShippingPolicy = productPolicies?.hasShippingPolicy ?? false;
  const hasRefundPolicy = productPolicies?.hasRefundPolicy ?? false;

  // A product's own features (Products → features) win; otherwise the
  // store-wide badges from the editor. No built-in fallback rows — an empty
  // list renders no badges at all.
  const productBadges = additionalFields
    ? buildLucideIconsWithLabels(additionalFields)
    : [];
  const storeBadges: StoreBadge[] =
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

        <div className="flex flex-col gap-10 lg:flex-row lg:gap-16">
          {/* Image Gallery */}
          <FadeIn direction="left" className="flex-1">
            <ProductGalleryHorizontal
              images={product.images}
              productName={product.name}
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
                <p className="text-muted-foreground mt-1 text-lg font-light">
                  {additionalFields.productTagline}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              {isOnSale && displayCompareAtPrice && (
                <span className="inline-flex items-center rounded-full bg-[var(--bam-forest)] px-3 py-1 text-sm font-semibold text-[var(--bam-cream)]">
                  {computeSavingsLabel(displayPrice, displayCompareAtPrice)}
                </span>
              )}
              <div className="flex items-baseline gap-2">
                {/* Large text only — --bam-gold measures ~3.5:1 on cream,
                    which clears AA for large text but not body-size text
                    (see docs/templates/bamboo/design.md contrast guardrails). */}
                <span className="text-3xl font-bold text-[var(--bam-gold)]">
                  {formatPrice(displayPrice)}
                </span>
                {isOnSale && displayCompareAtPrice && (
                  <span className="text-muted-foreground text-xl line-through">
                    <span className="sr-only">Original price: </span>
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
              <BambooProductActions
                product={product}
                business={business}
                comingSoonHeading={
                  f["bamboo.product.coming-soon-heading"] ?? ""
                }
                comingSoonBody={f["bamboo.product.coming-soon-body"] ?? ""}
              />

              {/* Trust / feature badges */}
              {productBadges.length > 0 ? (
                <ul className="grid grid-cols-2 gap-3">
                  {productBadges.map((badge) => (
                    <li
                      key={badge.label}
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

              {/* Shipping / Returns — each row only when its note is set */}
              {shippingSummary || returnsSummary ? (
                <div>
                  <h2 className="sr-only">Shipping and returns</h2>
                  <BambooAccordion className="space-y-3">
                    {shippingSummary ? (
                      <BambooAccordionItem id="shipping" title="Shipping">
                        <p
                          {...fieldAttr("bamboo.product.shipping-summary")}
                          className="text-sm leading-relaxed whitespace-pre-line"
                        >
                          {shippingSummary}
                        </p>
                        {hasShippingPolicy ? (
                          <Link
                            href="/shipping-policy"
                            className="mt-3 inline-block text-sm font-medium text-[var(--bam-forest)] underline underline-offset-4 hover:text-[var(--bam-forest-deep)]"
                          >
                            Read the full shipping policy
                          </Link>
                        ) : null}
                      </BambooAccordionItem>
                    ) : null}
                    {returnsSummary ? (
                      <BambooAccordionItem id="returns" title="Returns">
                        <p
                          {...fieldAttr("bamboo.product.returns-summary")}
                          className="text-sm leading-relaxed whitespace-pre-line"
                        >
                          {returnsSummary}
                        </p>
                        {hasRefundPolicy ? (
                          <Link
                            href="/refund-policy"
                            className="mt-3 inline-block text-sm font-medium text-[var(--bam-forest)] underline underline-offset-4 hover:text-[var(--bam-forest-deep)]"
                          >
                            Read the full returns policy
                          </Link>
                        ) : null}
                      </BambooAccordionItem>
                    ) : null}
                  </BambooAccordion>
                </div>
              ) : null}

              {questionText ? (
                <p className="text-sm">
                  <Link
                    href="/contact"
                    {...fieldAttr("bamboo.product.question-text")}
                    className="font-medium text-[var(--bam-forest)] underline underline-offset-4 hover:text-[var(--bam-forest-deep)]"
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
            // Inactive triggers default to text-foreground/60, which blends
            // below 4.5:1 on bamboo's warm muted surface. twMerge doesn't
            // recognize the two custom-token classes as the same group, so
            // the important modifier is needed to actually win the cascade.
            tabsTriggerClassName:
              "text-muted-foreground! data-[state=active]:text-foreground!",
            cardContentClassName:
              "text-muted-foreground mt-3 text-lg leading-relaxed whitespace-pre-line",
          }}
        />

        {/* Related Products — the whole block (heading included) only
            renders when there is something to show. */}
        {hasRelatedProducts ? (
          <section aria-labelledby="bamboo-related-heading" className="mb-20">
            <FadeIn direction="up">
              <h2
                id="bamboo-related-heading"
                {...fieldAttr("bamboo.product.related-heading")}
                className="font-serif text-2xl font-bold tracking-tight text-[var(--bam-forest-deep)] md:text-3xl"
              >
                {relatedHeading}
              </h2>
            </FadeIn>
            <StaggerContainer
              className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2"
              staggerDelay={0.12}
            >
              {relatedProducts?.map((p, index) => (
                <StaggerItem key={p.id}>
                  <BambooHorizontalProductCard
                    product={p as Product}
                    index={index}
                  />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </section>
        ) : null}
      </section>
    </PageTransition>
  );
}
