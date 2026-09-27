"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import { getLucideTemplateIcon } from "~/lib/lucide-template-icons";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { parseCardAdditionalFields } from "~/lib/products";
import { ANALYTICS_EVENTS } from "~/lib/umami/track";
import { api } from "~/trpc/react";
import { useProduct } from "~/hooks/use-product";
import { useReducedMotion } from "~/hooks/use-reduced-motion";
import { TrackView } from "~/components/analytics/track-view";
import { ProductReviews } from "~/components/product-reviews";
import { WriteReviewDialog } from "~/components/write-review-dialog";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { ProductDetailsAdditionalInfoAccordion } from "~/app/(storefront)/_components/product-page/additional-info-accordion";
import { useVariantImage } from "~/app/(storefront)/_components/product-page/variant-image-context";

import { resolveFields } from "..";
import { ElegantProductCard } from "../shared/elegant-product-card";
import { ElegantProductActions } from "./elegant-product-actions";

/**
 * Splits a heading into a plain-text lead and an italicized last word, e.g.
 * "You may also like" -> "You may also " + <em>like</em>. Mirrors the
 * previous hardcoded "Complete the *ritual*." treatment while letting the
 * owner author the whole heading as one field.
 */
function renderHeadingWithLastWordItalic(heading: string) {
  const trimmed = heading.trim();
  if (!trimmed) return null;
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace === -1) {
    return <em style={{ fontStyle: "italic" }}>{trimmed}</em>;
  }
  return (
    <>
      {trimmed.slice(0, lastSpace + 1)}
      <em style={{ fontStyle: "italic" }}>{trimmed.slice(lastSpace + 1)}</em>
    </>
  );
}

const easeOut = "cubic-bezier(0.16, 1, 0.3, 1)";
const ease = "cubic-bezier(0.22, 1, 0.36, 1)";

const TABS = [
  { key: "details", label: "Details" },
  { key: "how", label: "How to use" },
  { key: "info", label: "More info" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export function ElegantProductPage({
  product,
  business,
  productPolicies,
}: DefaultProductPageTemplateProps) {
  const { formatPrice, displayPrice, displayCompareAtPrice, isOnSale } =
    useProduct(product);

  const customFields = business?.siteContent?.customFields;
  const f = resolveFields(customFields, [
    "elegant.product.shipping-summary",
    "elegant.product.returns-summary",
    "elegant.product.related-label",
    "elegant.product.related-heading",
    "elegant.product.related-button",
    "elegant.product.reviews-label",
    "elegant.product.reviews-heading",
    "elegant.product.coming-soon-heading",
    "elegant.product.coming-soon-body",
  ]);
  const shippingSummary = (f["elegant.product.shipping-summary"] ?? "").trim();
  const returnsSummary = (f["elegant.product.returns-summary"] ?? "").trim();
  const relatedLabel = f["elegant.product.related-label"] ?? "";
  const relatedHeading = f["elegant.product.related-heading"] ?? "";
  const relatedButton = f["elegant.product.related-button"] ?? "";
  const reviewsLabel = f["elegant.product.reviews-label"] ?? "";
  const reviewsHeading = f["elegant.product.reviews-heading"] ?? "";
  const hasShippingPolicy = productPolicies?.hasShippingPolicy ?? false;
  const hasRefundPolicy = productPolicies?.hasRefundPolicy ?? false;

  const [shown, setShown] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<TabKey>("details");

  const { isEnabled } = useStorefrontFlags();
  const reviewsEnabled = isEnabled("reviews");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  const { variantImageUrl } = useVariantImage();
  // Jump to the variant's image when the selected variant changes.
  // Depend only on variantImageUrl so manual thumbnail clicks are not overridden.
  useEffect(() => {
    if (!variantImageUrl) return;
    const idx = product.images.findIndex((img) => img.url === variantImageUrl);
    if (idx >= 0) setSelectedImageIndex(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantImageUrl]);
  const tabListRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    window.scrollTo(0, 0);
    setSelectedImageIndex(0);
    setShown(false);
    const t = setTimeout(() => setShown(true), 60);
    return () => clearTimeout(t);
  }, [product.slug]);

  const additional = parseCardAdditionalFields(product.additionalFields);

  // `parseCardAdditionalFields` (shared across templates) doesn't recognize
  // a "how to use" key, so read it directly off the product's freeform JSON
  // here. Elegant is a generic template — it must not assume every business
  // sells skincare, so this tab only renders when the owner has actually
  // supplied per-product usage instructions via `additionalFields.howToUse`.
  const howToUseText =
    product.additionalFields &&
    typeof product.additionalFields === "object" &&
    !Array.isArray(product.additionalFields) &&
    typeof (product.additionalFields as Record<string, unknown>).howToUse ===
      "string"
      ? (
          (product.additionalFields as Record<string, unknown>)
            .howToUse as string
        ).trim()
      : "";

  const tabs = TABS.filter((tab) => tab.key !== "how" || !!howToUseText);

  const { data: relatedProducts } = api.product.getRelated.useQuery({
    productId: product.id,
  });

  const revealStyle = (delay: number): React.CSSProperties =>
    reducedMotion
      ? {}
      : {
          opacity: shown ? 1 : 0,
          transform: shown ? "translateY(0)" : "translateY(24px)",
          transition: `opacity 0.9s ${easeOut} ${delay}s, transform 0.9s ${easeOut} ${delay}s`,
        };

  const handleTabKeyDown = (e: React.KeyboardEvent, currentKey: TabKey) => {
    const keys = tabs.map((t) => t.key);
    const idx = keys.indexOf(currentKey);
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      next = (idx + 1) % keys.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      next = (idx - 1 + keys.length) % keys.length;
    } else if (e.key === "Home") {
      next = 0;
    } else if (e.key === "End") {
      next = keys.length - 1;
    }
    if (next !== null) {
      e.preventDefault();
      setActiveTab(keys[next]!);
      const btns =
        tabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      btns?.[next]?.focus();
    }
  };

  const currentImage =
    product.images[selectedImageIndex]?.url ?? "/placeholder.svg";

  return (
    <>
      <TrackView
        event={ANALYTICS_EVENTS.PRODUCT_VIEW}
        data={{ productId: product.id }}
      />
      {/* ── Product section ── */}
      <section
        style={{
          padding: "24px 40px 80px",
          background: "var(--el-cream, #f5f1ea)",
        }}
      >
        <div style={{ maxWidth: 1360, margin: "0 auto" }}>
          {/* Back link */}
          <div style={revealStyle(0)}>
            <Link
              href="/shop"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "var(--font-mono, ui-monospace)",
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--el-ink-soft, #6b6659)",
                textDecoration: "none",
                marginBottom: 32,
                transition: `color 0.3s ${ease}`,
              }}
              className="el-back-link"
            >
              <ArrowLeft aria-hidden={true} style={{ width: 13, height: 13 }} />
              Back to shop
            </Link>
          </div>

          {/* Two-column grid */}
          <div
            className="el-pdp-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 1fr",
              gap: 64,
              alignItems: "start",
            }}
          >
            {/* ── Gallery ── */}
            <div>
              {/* Main image */}
              <div
                style={{
                  ...revealStyle(0.05),
                  position: "relative",
                  aspectRatio: "4/5",
                  borderRadius: 8,
                  overflow: "hidden",
                  background: "var(--el-cream-2, #ebe6dc)",
                }}
              >
                <Image
                  src={currentImage}
                  alt={product.name}
                  fill
                  className="object-cover"
                  priority
                  style={{ transition: `transform 1.2s ${ease}` }}
                />
              </div>

              {/* Thumbnails */}
              {product.images.length > 1 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 12,
                    marginTop: 12,
                  }}
                >
                  {product.images.map((image, index) => (
                    <button
                      key={image.url}
                      type="button"
                      className="el-thumb-btn"
                      onClick={() => setSelectedImageIndex(index)}
                      style={{
                        position: "relative",
                        aspectRatio: "1",
                        borderRadius: 6,
                        overflow: "hidden",
                        border:
                          selectedImageIndex === index
                            ? "2px solid var(--el-ink, #1c1a17)"
                            : "2px solid transparent",
                        opacity: selectedImageIndex === index ? 1 : 0.55,
                        cursor: "pointer",
                        background: "var(--el-cream-2, #ebe6dc)",
                        transition: `opacity 0.3s ${ease}, border-color 0.3s ${ease}`,
                        padding: 0,
                      }}
                      aria-pressed={selectedImageIndex === index}
                      aria-label={`View image ${index + 1} of ${product.images.length}`}
                    >
                      <Image
                        src={image.url}
                        alt={`${product.name} ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Info panel (sticky) ── */}
            <div style={{ position: "sticky", top: 120 }}>
              {/* Eyebrow */}
              <div style={revealStyle(0)}>
                <span
                  style={{
                    fontFamily: "var(--font-mono, ui-monospace)",
                    fontSize: 11,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "var(--el-ink-soft, #6b6659)",
                    display: "block",
                    marginBottom: 14,
                  }}
                >
                  Product
                </span>
              </div>

              {/* Name */}
              <div style={revealStyle(0.08)}>
                <h1
                  style={{
                    fontFamily:
                      "var(--font-serif, 'Cormorant Garamond', serif)",
                    fontWeight: 400,
                    fontSize: "clamp(38px, 5vw, 60px)",
                    lineHeight: 1.0,
                    letterSpacing: "-0.01em",
                    marginBottom: 10,
                    color: "var(--el-ink, #1c1a17)",
                  }}
                >
                  {product.name}
                </h1>
              </div>

              {/* Tagline */}
              {additional?.productTagline && (
                <div style={revealStyle(0.12)}>
                  <p
                    style={{
                      fontFamily:
                        "var(--font-serif, 'Cormorant Garamond', serif)",
                      fontStyle: "italic",
                      fontSize: 18,
                      color: "var(--el-ink-soft, #6b6659)",
                      marginBottom: 16,
                      lineHeight: 1.4,
                    }}
                  >
                    {additional.productTagline}
                  </p>
                </div>
              )}

              {/* Description */}
              <div style={revealStyle(0.18)}>
                <p
                  style={{
                    fontSize: 16,
                    lineHeight: 1.7,
                    color: "var(--el-ink-soft, #6b6659)",
                    marginBottom: 28,
                    fontFamily: "var(--font-sans, sans-serif)",
                    whiteSpace: "pre-line",
                  }}
                >
                  {product.description}
                </p>
              </div>

              {/* Price */}
              <div style={revealStyle(0.24)}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 12,
                    marginBottom: 28,
                  }}
                >
                  <span
                    style={{
                      fontFamily:
                        "var(--font-serif, 'Cormorant Garamond', serif)",
                      fontSize: 32,
                      fontWeight: 500,
                      color: "var(--el-ink, #1c1a17)",
                    }}
                  >
                    {formatPrice(displayPrice)}
                  </span>
                  {isOnSale && displayCompareAtPrice && (
                    <span
                      style={{
                        fontSize: 18,
                        color: "var(--el-ink-soft, #6b6659)",
                        textDecoration: "line-through",
                      }}
                    >
                      <span className="sr-only">Original price: </span>
                      {formatPrice(displayCompareAtPrice)}
                    </span>
                  )}
                </div>
              </div>

              {/* Buy panel — everything the "Product page" editor section
                  controls sits inside this wrapper so its hotspot covers it. */}
              <div {...sectionGroupAttr("product", "details")}>
                {/* Actions */}
                <div style={revealStyle(0.3)}>
                  <ElegantProductActions
                    product={product}
                    business={business}
                    comingSoonHeading={
                      f["elegant.product.coming-soon-heading"] ?? ""
                    }
                    comingSoonBody={f["elegant.product.coming-soon-body"] ?? ""}
                  />
                </div>

                {/* Shipping / returns — each line only when its note is set */}
                {shippingSummary || returnsSummary ? (
                  <div style={revealStyle(0.38)}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                        paddingTop: 20,
                        borderTop:
                          "1px solid var(--el-line, rgba(28,26,23,0.12))",
                        marginBottom: 32,
                      }}
                    >
                      {shippingSummary ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 8,
                          }}
                        >
                          <Check
                            aria-hidden={true}
                            style={{
                              width: 13,
                              height: 13,
                              marginTop: 2,
                              flexShrink: 0,
                              color: "var(--el-sage, #4a5240)",
                            }}
                          />
                          <p
                            style={{
                              fontSize: 13,
                              color: "var(--el-ink-soft, #6b6659)",
                              fontFamily: "var(--font-sans, sans-serif)",
                              whiteSpace: "pre-line",
                              margin: 0,
                            }}
                          >
                            <span
                              {...fieldAttr("elegant.product.shipping-summary")}
                            >
                              {shippingSummary}
                            </span>
                            {hasShippingPolicy ? (
                              <>
                                {" "}
                                <Link
                                  href="/shipping-policy"
                                  style={{
                                    color: "var(--el-ink, #1c1a17)",
                                    textDecoration: "underline",
                                  }}
                                >
                                  Shipping policy
                                </Link>
                              </>
                            ) : null}
                          </p>
                        </div>
                      ) : null}
                      {returnsSummary ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 8,
                          }}
                        >
                          <Check
                            aria-hidden={true}
                            style={{
                              width: 13,
                              height: 13,
                              marginTop: 2,
                              flexShrink: 0,
                              color: "var(--el-sage, #4a5240)",
                            }}
                          />
                          <p
                            style={{
                              fontSize: 13,
                              color: "var(--el-ink-soft, #6b6659)",
                              fontFamily: "var(--font-sans, sans-serif)",
                              whiteSpace: "pre-line",
                              margin: 0,
                            }}
                          >
                            <span
                              {...fieldAttr("elegant.product.returns-summary")}
                            >
                              {returnsSummary}
                            </span>
                            {hasRefundPolicy ? (
                              <>
                                {" "}
                                <Link
                                  href="/refund-policy"
                                  style={{
                                    color: "var(--el-ink, #1c1a17)",
                                    textDecoration: "underline",
                                  }}
                                >
                                  Returns policy
                                </Link>
                              </>
                            ) : null}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Product features */}
              {additional?.productFeatures &&
                additional.productFeatures.length > 0 && (
                  <div style={revealStyle(0.44)}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 10,
                        marginBottom: 28,
                      }}
                    >
                      {additional.productFeatures.map((feature, index) => {
                        const Icon = getLucideTemplateIcon(feature.icon);
                        return (
                          <div
                            key={index}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 8,
                              borderRadius: 8,
                              padding: "16px 12px",
                              background: "var(--el-paper, #fbf8f2)",
                              border:
                                "1px solid var(--el-line-2, rgba(28,26,23,0.06))",
                              textAlign: "center",
                            }}
                          >
                            {Icon && (
                              <Icon
                                aria-hidden={true}
                                style={{
                                  width: 22,
                                  height: 22,
                                  color: "var(--el-sage, #4a5240)",
                                }}
                                strokeWidth={1.5}
                              />
                            )}
                            <span
                              style={{
                                fontSize: 12,
                                color: "var(--el-ink-soft, #6b6659)",
                                fontFamily: "var(--font-sans, sans-serif)",
                                lineHeight: 1.4,
                              }}
                            >
                              {feature.text}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              {/* Tabs */}
              <div style={revealStyle(0.5)}>
                {/* Tab bar */}
                <div
                  ref={tabListRef}
                  role="tablist"
                  aria-label="Product information"
                  style={{
                    display: "flex",
                    gap: 0,
                    borderBottom:
                      "1px solid var(--el-line, rgba(28,26,23,0.12))",
                    marginBottom: 20,
                  }}
                >
                  {tabs.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      id={`el-tab-${key}`}
                      aria-selected={activeTab === key}
                      aria-controls={`el-tabpanel-${key}`}
                      tabIndex={activeTab === key ? 0 : -1}
                      onClick={() => setActiveTab(key)}
                      onKeyDown={(e) => handleTabKeyDown(e, key)}
                      style={{
                        padding: "12px 0",
                        marginRight: 24,
                        fontSize: 12,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        fontFamily: "var(--font-mono, ui-monospace)",
                        color:
                          activeTab === key
                            ? "var(--el-ink, #1c1a17)"
                            : "var(--el-ink-soft, #6b6659)",
                        marginBottom: -1,
                        background: "none",
                        border: "none",
                        borderBottomWidth: 1,
                        borderBottomStyle: "solid",
                        borderBottomColor:
                          activeTab === key
                            ? "var(--el-ink, #1c1a17)"
                            : "transparent",
                        cursor: "pointer",
                        transition: `color 0.3s ${ease}`,
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div
                  role="tabpanel"
                  id={`el-tabpanel-${activeTab}`}
                  aria-labelledby={`el-tab-${activeTab}`}
                  style={{
                    fontSize: 15,
                    lineHeight: 1.7,
                    color: "var(--el-ink-soft, #6b6659)",
                    fontFamily: "var(--font-sans, sans-serif)",
                  }}
                >
                  {activeTab === "details" && <p>{product.description}</p>}
                  {activeTab === "how" && howToUseText && <p>{howToUseText}</p>}
                  {activeTab === "info" && (
                    <ProductDetailsAdditionalInfoAccordion
                      product={product}
                      styleProps={{ tipTapRendererClassName: "" }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Reviews — only mounts (and only fires review queries) when the
          reviews feature flag is enabled for this business. ── */}
      {reviewsEnabled && (
        <section
          style={{
            padding: "80px 40px",
            background: "var(--el-cream, #f5f1ea)",
          }}
        >
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <div style={{ marginBottom: 48 }}>
              <span
                {...fieldAttr("elegant.product.reviews-label")}
                style={{
                  fontFamily: "var(--font-mono, ui-monospace)",
                  fontSize: 11,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "var(--el-ink-soft, #6b6659)",
                  display: "block",
                  marginBottom: 14,
                }}
              >
                {reviewsLabel}
              </span>
              <h2
                {...fieldAttr("elegant.product.reviews-heading")}
                style={{
                  fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
                  fontWeight: 400,
                  fontSize: "clamp(36px, 4.5vw, 56px)",
                  lineHeight: 1.05,
                  letterSpacing: "-0.01em",
                  color: "var(--el-ink, #1c1a17)",
                }}
              >
                {reviewsHeading}
              </h2>
            </div>
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
          </div>
        </section>
      )}

      {/* ── Related products ── */}
      {relatedProducts && relatedProducts.length > 0 && (
        <section
          style={{
            padding: "80px 40px",
            background: "var(--el-paper, #fbf8f2)",
          }}
        >
          <div style={{ maxWidth: 1360, margin: "0 auto" }}>
            {/* Section header */}
            <div style={{ marginBottom: 48 }}>
              <span
                {...fieldAttr("elegant.product.related-label")}
                style={{
                  fontFamily: "var(--font-mono, ui-monospace)",
                  fontSize: 11,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "var(--el-ink-soft, #6b6659)",
                  display: "block",
                  marginBottom: 14,
                }}
              >
                {relatedLabel}
              </span>
              <h2
                {...fieldAttr("elegant.product.related-heading")}
                style={{
                  fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
                  fontWeight: 400,
                  fontSize: "clamp(36px, 4.5vw, 56px)",
                  lineHeight: 1.05,
                  letterSpacing: "-0.01em",
                  color: "var(--el-ink, #1c1a17)",
                }}
              >
                {renderHeadingWithLastWordItalic(relatedHeading)}
              </h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: 32,
              }}
            >
              {relatedProducts.map((p, i) => (
                <ElegantProductCard
                  key={p.id}
                  product={p}
                  index={i}
                  isVisible={true}
                />
              ))}
            </div>

            {/* View all link */}
            <div style={{ marginTop: 48, textAlign: "center" }}>
              <Link
                href="/shop"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--el-ink, #1c1a17)",
                  textDecoration: "none",
                  fontFamily: "var(--font-sans, sans-serif)",
                }}
              >
                <span {...fieldAttr("elegant.product.related-button")}>
                  {relatedButton}
                </span>
                <ArrowRight
                  aria-hidden={true}
                  style={{ width: 14, height: 14 }}
                />
              </Link>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
