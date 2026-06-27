"use client";

import Link from "next/link";
import { Check } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { Product } from "~/types";
import { computeSavingsLabel } from "~/lib/prices";
import {
  getListFieldValue,
  isContentEmpty,
  parseTemplateTrustBadgesListRows,
} from "~/lib/template-fields";
import { ANALYTICS_EVENTS } from "~/lib/umami/track";
import { api } from "~/trpc/react";
import { useProduct } from "~/hooks/use-product";
import { TrackView } from "~/components/analytics/track-view";
import { PageTransition } from "~/components/page-animations";
import { TiptapRenderer } from "~/components/tiptap-renderer";
import { ProductGalleryVertical } from "~/app/(storefront)/_components/product-page/product-gallery-vertical-sticky";

import { resolveFields } from "..";
import { useViiReveal } from "../hooks/use-vii-reveal";
import { ViiOverline } from "../shared/vii-overline";
import { ViiProductCard } from "../shared/vii-product-card";
import { ViiProductActions } from "./vii-product-actions";

function AccordionItem({
  summary,
  children,
  defaultOpen,
}: {
  summary: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="group"
      style={{
        borderBottom: "1px solid var(--vii-hairline)",
        padding: "20px 0",
      }}
    >
      <summary
        className="[&::-webkit-details-marker]:hidden"
        style={{
          display: "flex",
          cursor: "pointer",
          listStyle: "none",
          alignItems: "center",
          justifyContent: "space-between",
          userSelect: "none",
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--vii-navy)",
        }}
      >
        {summary}
        <span
          aria-hidden="true"
          className="transition-transform duration-200 group-open:rotate-45"
          style={{ fontSize: 20, fontWeight: 300, color: "var(--vii-copper)" }}
        >
          +
        </span>
      </summary>
      <div
        style={{
          paddingTop: 14,
          fontFamily: "var(--font-sans)",
          fontSize: 14,
          lineHeight: 1.7,
          color: "var(--vii-ink-soft)",
        }}
      >
        {children}
      </div>
    </details>
  );
}

export function ViiProductPage({
  product,
  business,
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
  const f = resolveFields(business?.siteContent?.customFields, [
    "vii.global.product-shipping-description",
    "vii.global.product-question-description",
  ]);
  const globalProductTrustBadges = parseTemplateTrustBadgesListRows(
    getListFieldValue(
      business?.siteContent?.customFields,
      "vii.global.product-trust-badges",
    ),
    [
      { label: "Ships in 1-2 business days" },
      { label: "Free returns within 30 days" },
    ],
  );

  const trustBadges =
    displayTrustBadges.length > 0
      ? displayTrustBadges
      : (globalProductTrustBadges ?? []);

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

            {/* Actions */}
            <ViiProductActions
              product={product}
              business={business}
              selectedVariantId={selectedVariantId}
              setSelectedVariantId={setSelectedVariantId}
            />

            {/* Trust signals */}
            {trustBadges.length > 0 && (
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
                {trustBadges.map((badge) => (
                  <span
                    key={badge.label}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Check
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
            )}

            {/* Accordion */}
            <div
              style={{
                marginTop: 8,
                borderTop: "1px solid var(--vii-hairline)",
              }}
            >
              {!isAdditionalEmpty && (
                <AccordionItem summary="Details" defaultOpen>
                  <TiptapRenderer
                    content={
                      additionalFields?.additionalInformation as TiptapJSON
                    }
                    className="prose prose-sm max-w-none"
                  />
                </AccordionItem>
              )}
              <AccordionItem summary="Shipping &amp; returns">
                {f["vii.global.product-shipping-description"] && (
                  <p style={{ margin: "0 0 8px" }}>
                    {f["vii.global.product-shipping-description"]}
                  </p>
                )}
                <p style={{ margin: 0 }}>
                  Calculated at checkout.{" "}
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
                </p>
              </AccordionItem>
            </div>

            {/* Ask a question — inline */}
            {f["vii.global.product-question-description"] && (
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  color: "var(--vii-ink-soft)",
                  margin: 0,
                }}
              >
                {f["vii.global.product-question-description"]}{" "}
                <Link
                  href="/contact"
                  style={{
                    color: "var(--vii-navy)",
                    textDecoration: "underline",
                    textUnderlineOffset: 2,
                  }}
                >
                  You can reach out to us here.
                </Link>
              </p>
            )}
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
              className={`vii-reveal-group${related.visible ? "is-visible" : ""}`}
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
                  >
                    Pair it with
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
                    You may also{" "}
                    <em
                      style={{
                        fontStyle: "italic",
                        color: "var(--vii-copper)",
                      }}
                    >
                      like
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
                  All products
                  <span aria-hidden="true">→</span>
                </Link>
              </div>

              {/* Product grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: "clamp(20px, 3vw, 36px)",
                }}
              >
                {relatedProducts?.map((p, index) => (
                  <div
                    key={p.id}
                    className="vii-reveal-item"
                    style={
                      { "--i": Math.min(index + 1, 7) } as React.CSSProperties
                    }
                  >
                    <ViiProductCard
                      product={p as unknown as Product}
                      index={index}
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </PageTransition>
  );
}
