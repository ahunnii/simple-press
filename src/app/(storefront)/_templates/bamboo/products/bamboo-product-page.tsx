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
import { computeSavingsLabel } from "~/lib/prices";
import { isSectionVisible } from "~/lib/sp-meta";
import {
  getListFieldValue,
  parseTemplateTrustBadgesListRows,
} from "~/lib/template-fields";
import { cn } from "~/lib/utils";
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
import { BambooHorizontalProductCard } from "../shared/bamboo-product-card";
import { BambooPageShelf } from "../shared/bamboo-page-shelf";
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
    "bamboo.product.reviews-heading",
  ]);
  const shippingSummary = (f["bamboo.product.shipping-summary"] ?? "").trim();
  const returnsSummary = (f["bamboo.product.returns-summary"] ?? "").trim();
  const questionText = (f["bamboo.product.question-text"] ?? "").trim();
  const relatedHeading = f["bamboo.product.related-heading"] ?? "";
  const reviewsHeading = f["bamboo.product.reviews-heading"] ?? "";
  const hasShippingPolicy = productPolicies?.hasShippingPolicy ?? false;
  const hasRefundPolicy = productPolicies?.hasRefundPolicy ?? false;

  // Shipping / returns / questions are each their own hideable section
  // (product.shipping / product.returns / product.questions) so an owner can
  // hide one row without hiding the others. A row shows when its note is set
  // OR its policy page is published (B6.2) — the note alone is not required.
  const showShippingRow =
    isSectionVisible(customFields, "bamboo", "product.shipping") &&
    (shippingSummary !== "" || hasShippingPolicy);
  const showReturnsRow =
    isSectionVisible(customFields, "bamboo", "product.returns") &&
    (returnsSummary !== "" || hasRefundPolicy);
  const showQuestionsRow =
    isSectionVisible(customFields, "bamboo", "product.questions") &&
    questionText !== "";

  const { isEnabled } = useStorefrontFlags();
  const reviewsEnabled = isEnabled("reviews");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

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
      <BambooPageShelf variant="compact">
        {/* Breadcrumb */}
        <FadeIn direction="none" duration={0.3}>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-muted-foreground gap-1"
          >
            <Link href="/shop">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to Shop
            </Link>
          </Button>
        </FadeIn>
      </BambooPageShelf>

      <section className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-12">
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-16">
          {/* Image Gallery */}
          <FadeIn direction="left" className="flex-1">
            <ProductGalleryHorizontal
              images={product.images}
              productName={product.name}
              enableLightbox
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
              {/* Wishlist — its own row above the buy panel so it stays
                  visible across every BambooProductActions branch (coming
                  soon, variants, out of stock, in stock). Self-gates on the
                  wishlist flag (renders nothing when off). */}
              <WishlistButton
                item={{
                  productId: product.id,
                  name: product.name,
                  slug: product.slug,
                  price: displayPrice,
                  imageUrl: product.images[0]?.url ?? null,
                }}
                className="border-[var(--bam-hairline)] bg-background text-[var(--bam-forest)] static flex size-10 shrink-0 items-center justify-center self-start rounded-lg border shadow-none backdrop-blur-none hover:scale-100 hover:bg-[var(--bam-cream-deep)]"
                iconClassName="size-4"
              />

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

              {/* Shipping / Returns — each row is its own hideable section
                  (product.shipping / product.returns), rendering when its
                  note is set OR its policy is published, and independently
                  toggleable in the editor. Always-open info cards (not an
                  accordion) — sectionAttrs spread directly onto each
                  BambooPolicyNote's root. */}
              {showShippingRow || showReturnsRow ? (
                <div>
                  <h2 className="sr-only">Shipping and returns</h2>
                  <div className="divide-y divide-[var(--bam-hairline)] rounded-(--radius) border border-[var(--bam-hairline)]">
                    {showShippingRow ? (
                      <BambooPolicyNote
                        sectionAttrs={sectionGroupAttr("product", "shipping")}
                        Icon={Truck}
                        title="Shipping"
                        fieldKey="bamboo.product.shipping-summary"
                        note={shippingSummary}
                        policyHref={
                          hasShippingPolicy ? "/shipping-policy" : undefined
                        }
                        policyLabel="Read the full shipping policy"
                      />
                    ) : null}
                    {showReturnsRow ? (
                      <BambooPolicyNote
                        sectionAttrs={sectionGroupAttr("product", "returns")}
                        Icon={RotateCcw}
                        title="Returns"
                        fieldKey="bamboo.product.returns-summary"
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

              {showQuestionsRow ? (
                <p
                  {...sectionGroupAttr("product", "questions")}
                  className="text-sm"
                >
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

        {/* Reviews — only mounts (and only fires review queries) when the
            reviews feature flag is enabled for this business. */}
        {reviewsEnabled ? (
          <FadeIn direction="up">
            <section
              aria-label="Reviews"
              className="mt-4 mb-20 border-t border-[var(--bam-hairline)] pt-16"
            >
              {reviewsHeading ? (
                <h2
                  {...fieldAttr("bamboo.product.reviews-heading")}
                  className="font-serif text-2xl font-bold tracking-tight text-[var(--bam-forest-deep)] md:text-3xl"
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

function BambooPolicyNote({
  Icon,
  title,
  fieldKey,
  note,
  policyHref,
  policyLabel,
  sectionAttrs,
}: {
  Icon: LucideIcon;
  title: string;
  fieldKey: string;
  note?: string;
  /** Only set when the matching policy page is published. */
  policyHref: string | undefined;
  policyLabel: string;
  /** `sectionGroupAttr("product", "shipping" | "returns")` — makes this row its own editor hotspot. */
  sectionAttrs?: Record<string, string>;
}) {
  return (
    <div {...sectionAttrs} className="flex gap-3 px-4 py-3">
      <Icon
        className="mt-0.5 size-4 shrink-0 text-[var(--bam-forest)]"
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
            className={cn(
              "inline-block text-sm font-medium text-[var(--bam-forest)] underline underline-offset-4 hover:text-[var(--bam-forest-deep)]",
              note && "mt-2",
            )}
          >
            {policyLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
