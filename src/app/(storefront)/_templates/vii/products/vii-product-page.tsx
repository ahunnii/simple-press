"use client";

import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { Product } from "~/types";
import { fieldAttr, listItemAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { computeSavingsLabel } from "~/lib/prices";
import { isSectionVisible } from "~/lib/sp-meta";
import {
  getListFieldValue,
  getRawCustomFieldString,
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

import { resolveFields } from "..";
import { useViiReveal } from "../hooks/use-vii-reveal";
import { ViiAccordion, ViiAccordionItem } from "../shared/vii-accordion";
import { ViiOverline } from "../shared/vii-overline";
import { ViiProductGrid } from "../shared/vii-product-grid";
import { ViiProductActions } from "./vii-product-actions";

/**
 * Returns `value` trimmed, or `undefined` when it's blank/absent. Used to
 * chain a new field's saved value with a retired legacy key's raw saved
 * value via `??` (see noise/olive location-tag helpers for the pattern).
 */
function nonBlank(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed?.length ? trimmed : undefined;
}

const TRUST_BADGES_KEY = "vii.global.product-trust-badges";

type StoreBadge = {
  Icon: LucideIcon;
  label: string;
  /** Position in the saved list, for the editor's click-to-row targeting. */
  index: number;
};

export function ViiProductPage({
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
    selectedVariantId,
    setSelectedVariantId,
  } = useProduct(product);

  const { data: relatedProducts } = api.product.getRelated.useQuery({
    productId: product.id,
  });

  const related = useViiReveal(0.08);

  const isAdditionalEmpty = isContentEmpty(
    additionalFields?.additionalInformation as TiptapJSON,
  );
  const customFields = business?.siteContent?.customFields;
  const f = resolveFields(customFields, [
    "vii.product.shipping-summary",
    "vii.product.returns-summary",
    "vii.product.question-text",
    "vii.product.related-overline",
    "vii.product.related-heading",
    "vii.product.related-heading-accent",
    "vii.product.related-link-text",
    "vii.product.coming-soon-heading",
    "vii.product.coming-soon-body",
    "vii.product.reviews-heading",
  ]);

  // Shipping / returns / questions used to be two combined fields
  // (`vii.global.product-shipping-description`, `-question-description`,
  // retired 2026-09-28 PF19). Their raw saved values are a read-only
  // fallback so skinbar-vii's existing copy keeps showing until the owner
  // re-saves the new split fields.
  const shippingSummary =
    nonBlank(f["vii.product.shipping-summary"]) ??
    nonBlank(
      getRawCustomFieldString(
        customFields,
        "vii.global.product-shipping-description",
      ),
    ) ??
    "";
  const returnsSummary = nonBlank(f["vii.product.returns-summary"]) ?? "";
  const questionText =
    nonBlank(f["vii.product.question-text"]) ??
    nonBlank(
      getRawCustomFieldString(
        customFields,
        "vii.global.product-question-description",
      ),
    ) ??
    "";
  const reviewsHeading = f["vii.product.reviews-heading"] ?? "";
  const hasShippingPolicy = productPolicies?.hasShippingPolicy ?? false;
  const hasRefundPolicy = productPolicies?.hasRefundPolicy ?? false;

  // Each row is its own hideable section (product.shipping / product.returns
  // / product.questions) so an owner can hide one without hiding the others.
  const showShippingRow =
    isSectionVisible(customFields, "vii", "product.shipping") &&
    (shippingSummary !== "" || hasShippingPolicy);
  const showReturnsRow =
    isSectionVisible(customFields, "vii", "product.returns") &&
    (returnsSummary !== "" || hasRefundPolicy);
  const showQuestionsRow =
    isSectionVisible(customFields, "vii", "product.questions") &&
    questionText !== "";

  const { isEnabled } = useStorefrontFlags();
  const reviewsEnabled = isEnabled("reviews");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  // A product's own features (Products → features) win; otherwise the
  // store-wide badges from the editor. No built-in fallback rows — an empty
  // list renders no badges at all.
  const productBadges = displayTrustBadges;
  const storeBadges: StoreBadge[] =
    productBadges.length > 0
      ? []
      : (
          parseTemplateTrustBadgesListRows(
            getListFieldValue(customFields, TRUST_BADGES_KEY),
          ) ?? []
        )
          .map((row, index) => ({
            Icon: row.icon ?? Check,
            label: row.label.trim(),
            index,
          }))
          .filter((row) => row.label.length > 0);

  return (
    <PageTransition>
      <TrackView
        event={ANALYTICS_EVENTS.PRODUCT_VIEW}
        data={{ productId: product.id }}
      />
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 clamp(24px, 6vw, 96px)",
        }}
      >
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 8,
            // Clear the fixed header (≈106px) plus generous editorial breathing room.
            padding:
              "calc(var(--vii-header-offset) + clamp(40px, 6vw, 72px)) 0 clamp(20px, 3vw, 32px)",
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--vii-ink-soft)",
          }}
        >
          <Link
            href="/"
            className="vii-nav-link"
            style={{
              color: "inherit",
              textDecoration: "none",
              position: "relative",
            }}
          >
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            href="/shop"
            className="vii-nav-link"
            style={{
              color: "inherit",
              textDecoration: "none",
              position: "relative",
            }}
          >
            Shop
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" style={{ color: "var(--vii-navy)" }}>
            {product.name}
          </span>
        </nav>

        {/* PDP layout */}
        <div className="grid grid-cols-1 gap-8 pb-24 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
          {/* Gallery */}
          <ProductGalleryVertical
            images={product.images}
            productName={product.name}
            enableLightbox
            styleProps={{
              containerClassName:
                "lg:sticky lg:top-[calc(var(--vii-header-offset)+24px)] lg:self-start",
              // Bridge the shared gallery onto vii tokens: paper surface + vii
              // radius (overrides the component's bg-secondary / rounded-2xl) so
              // the product sits on the same light field as the listing cards.
              singleImageContainerClassName:
                "rounded-[var(--radius)] bg-[var(--vii-paper)]",
              unselectedButtonClassName:
                "rounded-[var(--radius)] border-[var(--vii-hairline)] bg-[var(--vii-paper)]",
              selectedButtonClassName:
                "rounded-[var(--radius)] border-[var(--vii-copper)] ring-[var(--vii-copper)] bg-[var(--vii-paper)]",
            }}
          />

          {/* Info panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Name + price */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <h1
                style={{
                  fontFamily: "var(--font-serif)",
                  fontWeight: 400,
                  fontSize: "clamp(30px, 4vw, 44px)",
                  lineHeight: 1.1,
                  color: "var(--vii-navy)",
                  margin: 0,
                }}
              >
                {product.name}
              </h1>
              {additionalFields?.productTagline && (
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 14,
                    color: "var(--vii-ink-soft)",
                    margin: 0,
                  }}
                >
                  {additionalFields.productTagline}
                </p>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {isOnSale && displayCompareAtPrice && (
                  <span className="sr-only">Sale price </span>
                )}
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 22,
                    fontWeight: 500,
                    color: "var(--vii-navy)",
                  }}
                >
                  {formatPrice(displayPrice)}
                </span>
                {isOnSale && displayCompareAtPrice && (
                  <>
                    <span className="sr-only">Original price </span>
                    <span
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 18,
                        color: "var(--vii-ink-soft)",
                        textDecoration: "line-through",
                      }}
                    >
                      {formatPrice(displayCompareAtPrice)}
                    </span>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        borderRadius: "var(--radius)",
                        background: "var(--vii-copper-deep)",
                        color: "var(--vii-paper)",
                        padding: "2px 8px",
                        fontFamily: "var(--font-sans)",
                        fontSize: 10,
                        fontWeight: 500,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                      }}
                    >
                      {computeSavingsLabel(displayPrice, displayCompareAtPrice)}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 15,
                  lineHeight: 1.7,
                  color: "var(--vii-ink-soft)",
                  margin: 0,
                }}
              >
                {product.description}
              </p>
            )}

            {/* Buy panel — everything the "Product page" editor section
                controls sits inside this wrapper so its hotspot covers it. */}
            <div
              {...sectionGroupAttr("product", "details")}
              style={{ display: "flex", flexDirection: "column", gap: 24 }}
            >
              {/* Wishlist — its own row above the buy panel so it stays
                  visible across every ViiProductActions branch (coming
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
                className="static flex size-10 shrink-0 items-center justify-center self-start rounded-[var(--radius)] border border-[var(--vii-hairline)] bg-[var(--vii-paper)] text-[var(--vii-navy)] shadow-none backdrop-blur-none hover:scale-100 hover:bg-[var(--vii-cream)]"
                iconClassName="size-4"
              />

              {/* Actions */}
              <ViiProductActions
                product={product}
                business={business}
                selectedVariantId={selectedVariantId}
                setSelectedVariantId={setSelectedVariantId}
                comingSoonHeading={f["vii.product.coming-soon-heading"] ?? ""}
                comingSoonBody={f["vii.product.coming-soon-body"] ?? ""}
              />

              {/* Trust signals — a product's own features win; otherwise the
                  store-wide badges from the editor. */}
              {productBadges.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    columnGap: 24,
                    rowGap: 6,
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    color: "var(--vii-ink-soft)",
                  }}
                >
                  {productBadges.map((badge) => (
                    <span
                      key={badge.label}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <badge.Icon
                        aria-hidden="true"
                        style={{
                          width: 14,
                          height: 14,
                          color: "var(--vii-copper)",
                          flexShrink: 0,
                        }}
                      />
                      {badge.label}
                    </span>
                  ))}
                </div>
              ) : storeBadges.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    columnGap: 24,
                    rowGap: 6,
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    color: "var(--vii-ink-soft)",
                  }}
                >
                  {storeBadges.map((badge) => (
                    <span
                      key={badge.index}
                      {...listItemAttr(TRUST_BADGES_KEY, badge.index)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <badge.Icon
                        aria-hidden="true"
                        style={{
                          width: 14,
                          height: 14,
                          color: "var(--vii-copper)",
                          flexShrink: 0,
                        }}
                      />
                      {badge.label}
                    </span>
                  ))}
                </div>
              ) : null}

              {/* Accordion — Details (not hideable), then Shipping / Returns
                  / Questions, each its own hideable section
                  (product.shipping / product.returns / product.questions)
                  so an owner can hide one row without hiding the others. */}
              {(!isAdditionalEmpty ||
                showShippingRow ||
                showReturnsRow ||
                showQuestionsRow) && (
                <ViiAccordion style={{ marginTop: 8 }}>
                  {!isAdditionalEmpty && (
                    <ViiAccordionItem title="Details" defaultOpen>
                      <TiptapRenderer
                        content={
                          additionalFields?.additionalInformation as TiptapJSON
                        }
                        className="prose prose-sm max-w-none"
                      />
                    </ViiAccordionItem>
                  )}
                  {showShippingRow && (
                    <div {...sectionGroupAttr("product", "shipping")}>
                      <ViiAccordionItem title="Shipping">
                        {shippingSummary && (
                          <p
                            {...fieldAttr("vii.product.shipping-summary")}
                            style={{
                              margin: "0 0 8px",
                              whiteSpace: "pre-line",
                            }}
                          >
                            {shippingSummary}
                          </p>
                        )}
                        {hasShippingPolicy && (
                          <Link
                            href="/shipping-policy"
                            style={{
                              color: "var(--vii-navy)",
                              textDecoration: "underline",
                              textUnderlineOffset: 2,
                            }}
                          >
                            Read the full shipping policy
                          </Link>
                        )}
                      </ViiAccordionItem>
                    </div>
                  )}
                  {showReturnsRow && (
                    <div {...sectionGroupAttr("product", "returns")}>
                      <ViiAccordionItem title="Returns">
                        {returnsSummary && (
                          <p
                            {...fieldAttr("vii.product.returns-summary")}
                            style={{
                              margin: "0 0 8px",
                              whiteSpace: "pre-line",
                            }}
                          >
                            {returnsSummary}
                          </p>
                        )}
                        {hasRefundPolicy && (
                          <Link
                            href="/refund-policy"
                            style={{
                              color: "var(--vii-navy)",
                              textDecoration: "underline",
                              textUnderlineOffset: 2,
                            }}
                          >
                            Read the full returns policy
                          </Link>
                        )}
                      </ViiAccordionItem>
                    </div>
                  )}
                  {showQuestionsRow && (
                    <div {...sectionGroupAttr("product", "questions")}>
                      <ViiAccordionItem title="Questions">
                        <p style={{ margin: 0 }}>
                          <Link
                            href="/contact"
                            {...fieldAttr("vii.product.question-text")}
                            style={{
                              color: "var(--vii-navy)",
                              textDecoration: "underline",
                              textUnderlineOffset: 2,
                            }}
                          >
                            {questionText}
                          </Link>
                        </p>
                      </ViiAccordionItem>
                    </div>
                  )}
                </ViiAccordion>
              )}
            </div>
          </div>
        </div>

        {/* Reviews — only mounts (and only fires review queries) when the
            reviews feature flag is enabled for this business. */}
        {reviewsEnabled && (
          <section
            aria-label="Reviews"
            style={{
              borderTop: "1px solid var(--vii-hairline)",
              padding: "clamp(56px, 8vw, 96px) 0 clamp(64px, 9vw, 112px)",
            }}
          >
            {reviewsHeading && (
              <h2
                {...fieldAttr("vii.product.reviews-heading")}
                style={{
                  fontFamily: "var(--font-serif)",
                  fontWeight: 400,
                  fontSize: "clamp(26px, 3.6vw, 40px)",
                  lineHeight: 1.1,
                  color: "var(--vii-navy)",
                  margin: "0 0 32px",
                }}
              >
                {reviewsHeading}
              </h2>
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
          <section
            aria-labelledby="vii-related-heading"
            style={{
              borderTop: "1px solid var(--vii-hairline)",
              padding: "clamp(56px, 8vw, 96px) 0 clamp(64px, 9vw, 112px)",
            }}
          >
            <div
              ref={related.ref}
              className={cn(
                "vii-reveal-group",
                related.visible && "is-visible",
              )}
            >
              {/* Header */}
              <div
                className="vii-reveal-item"
                style={
                  {
                    "--i": 0,
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "flex-end",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: "clamp(28px, 4vw, 44px)",
                  } as React.CSSProperties
                }
              >
                <div>
                  <ViiOverline
                    align="left"
                    tone="light"
                    style={{ marginBottom: 6 }}
                    fieldKey="vii.product.related-overline"
                  >
                    {f["vii.product.related-overline"] ?? ""}
                  </ViiOverline>
                  <h2
                    id="vii-related-heading"
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontWeight: 400,
                      fontSize: "clamp(26px, 3.6vw, 40px)",
                      lineHeight: 1.1,
                      color: "var(--vii-navy)",
                      margin: 0,
                    }}
                  >
                    <span {...fieldAttr("vii.product.related-heading")}>
                      {f["vii.product.related-heading"] ?? ""}
                    </span>{" "}
                    <em
                      {...fieldAttr("vii.product.related-heading-accent")}
                      style={{
                        fontStyle: "italic",
                        color: "var(--vii-copper)",
                      }}
                    >
                      {f["vii.product.related-heading-accent"] ?? ""}
                    </em>
                  </h2>
                </div>
                <Link
                  href="/shop"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    flexShrink: 0,
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    fontWeight: 500,
                    color: "var(--vii-navy)",
                    textDecoration: "none",
                    borderBottom: "1px solid var(--vii-copper)",
                    paddingBottom: 4,
                  }}
                >
                  <span {...fieldAttr("vii.product.related-link-text")}>
                    {f["vii.product.related-link-text"] ?? ""}
                  </span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>

              {/* Product grid */}
              <ViiProductGrid
                products={(relatedProducts ?? []) as unknown as Product[]}
              />
            </div>
          </section>
        )}
      </div>
    </PageTransition>
  );
}
