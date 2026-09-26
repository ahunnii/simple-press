"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Check } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { Product } from "~/types";
import { fieldAttr, listItemAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { computeSavingsLabel } from "~/lib/prices";
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
import { TiptapRenderer } from "~/components/tiptap-renderer";
import { ProductGalleryVertical } from "~/app/(storefront)/_components/product-page/product-gallery-vertical-sticky";

import { resolveFields } from "..";
import { useViiReveal } from "../hooks/use-vii-reveal";
import { ViiAccordion, ViiAccordionItem } from "../shared/vii-accordion";
import { ViiOverline } from "../shared/vii-overline";
import { ViiProductGrid } from "../shared/vii-product-grid";
import { ViiProductActions } from "./vii-product-actions";

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
    "vii.global.product-shipping-description",
    "vii.global.product-question-description",
    "vii.product.question-link-text",
    "vii.product.related-overline",
    "vii.product.related-heading",
    "vii.product.related-heading-accent",
    "vii.product.related-link-text",
    "vii.product.coming-soon-heading",
    "vii.product.coming-soon-body",
  ]);

  const shippingDescription = (
    f["vii.global.product-shipping-description"] ?? ""
  ).trim();
  const questionDescription = (
    f["vii.global.product-question-description"] ?? ""
  ).trim();
  const questionLinkText = (f["vii.product.question-link-text"] ?? "").trim();
  const hasShippingPolicy = productPolicies?.hasShippingPolicy ?? false;
  const hasRefundPolicy = productPolicies?.hasRefundPolicy ?? false;

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

              {/* Accordion */}
              {(!isAdditionalEmpty || shippingDescription) && (
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
                  {shippingDescription && (
                    <ViiAccordionItem title="Shipping &amp; returns">
                      <p
                        {...fieldAttr("vii.global.product-shipping-description")}
                        style={{ margin: "0 0 8px", whiteSpace: "pre-line" }}
                      >
                        {shippingDescription}
                      </p>
                      {(hasShippingPolicy || hasRefundPolicy) && (
                        <p
                          style={{
                            margin: 0,
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 16,
                          }}
                        >
                          {hasShippingPolicy && (
                            <Link
                              href="/shipping-policy"
                              style={{
                                color: "var(--vii-navy)",
                                textDecoration: "underline",
                                textUnderlineOffset: 2,
                              }}
                            >
                              View shipping policy
                            </Link>
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
                              View returns policy
                            </Link>
                          )}
                        </p>
                      )}
                    </ViiAccordionItem>
                  )}
                </ViiAccordion>
              )}

              {/* Ask a question — inline */}
              {questionDescription && (
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    color: "var(--vii-ink-soft)",
                    margin: 0,
                  }}
                >
                  <span
                    {...fieldAttr("vii.global.product-question-description")}
                  >
                    {questionDescription}
                  </span>
                  {questionLinkText && (
                    <>
                      {" "}
                      <Link
                        href="/contact"
                        {...fieldAttr("vii.product.question-link-text")}
                        style={{
                          color: "var(--vii-navy)",
                          textDecoration: "underline",
                          textUnderlineOffset: 2,
                        }}
                      >
                        {questionLinkText}
                      </Link>
                    </>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>

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
