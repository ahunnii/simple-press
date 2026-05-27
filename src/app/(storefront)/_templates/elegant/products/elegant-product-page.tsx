"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import { getLucideTemplateIcon } from "~/lib/lucide-template-icons";
import { parseCardAdditionalFields } from "~/lib/products";
import { api } from "~/trpc/react";
import { useProduct } from "~/hooks/use-product";
import { ProductDetailsAdditionalInfoAccordion } from "~/app/(storefront)/_components/product-page/additional-info-accordion";

import { ElegantProductCard } from "../shared/elegant-product-card";
import { ElegantProductActions } from "./elegant-product-actions";

const easeOut = "cubic-bezier(0.16, 1, 0.3, 1)";
const ease = "cubic-bezier(0.22, 1, 0.36, 1)";

const TABS = [
  { key: "details", label: "Details" },
  { key: "how", label: "How to use" },
  { key: "info", label: "More info" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export function ElegantProductPage({ product }: DefaultProductPageTemplateProps) {
  const { formatPrice, displayPrice, displayCompareAtPrice, isOnSale } =
    useProduct(product);

  const [shown, setShown] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<TabKey>("details");
  const tabListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    setSelectedImageIndex(0);
    setShown(false);
    const t = setTimeout(() => setShown(true), 60);
    return () => clearTimeout(t);
  }, [product.slug]);

  const additional = parseCardAdditionalFields(product.additionalFields);

  const { data: relatedProducts } = api.product.getRelated.useQuery({
    productId: product.id,
  });

  const revealStyle = (delay: number): React.CSSProperties => ({
    opacity: shown ? 1 : 0,
    transform: shown ? "translateY(0)" : "translateY(24px)",
    transition: `opacity 0.9s ${easeOut} ${delay}s, transform 0.9s ${easeOut} ${delay}s`,
  });

  const handleTabKeyDown = (e: React.KeyboardEvent, currentKey: TabKey) => {
    const keys = TABS.map((t) => t.key);
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
      const btns = tabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      btns?.[next]?.focus();
    }
  };

  const currentImage =
    product.images[selectedImageIndex]?.url ?? "/placeholder.svg";

  return (
    <>
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
                      aria-label={`View image ${index + 1}`}
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

              {/* Actions */}
              <div style={revealStyle(0.3)}>
                <ElegantProductActions product={product} />
              </div>

              {/* Trust line */}
              <div style={revealStyle(0.38)}>
                <div
                  style={{
                    display: "flex",
                    gap: 24,
                    paddingTop: 20,
                    borderTop:
                      "1px solid var(--el-line, rgba(28,26,23,0.12))",
                    marginBottom: 32,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                      color: "var(--el-ink-soft, #6b6659)",
                      fontFamily: "var(--font-sans, sans-serif)",
                    }}
                  >
                    <Check
                      style={{
                        width: 13,
                        height: 13,
                        color: "var(--el-sage, #4a5240)",
                      }}
                    />
                    Free shipping over $80
                  </span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                      color: "var(--el-ink-soft, #6b6659)",
                      fontFamily: "var(--font-sans, sans-serif)",
                    }}
                  >
                    <Check
                      style={{
                        width: 13,
                        height: 13,
                        color: "var(--el-sage, #4a5240)",
                      }}
                    />
                    Easy returns
                  </span>
                </div>
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
                              background:
                                "var(--el-paper, #fbf8f2)",
                              border:
                                "1px solid var(--el-line-2, rgba(28,26,23,0.06))",
                              textAlign: "center",
                            }}
                          >
                            {Icon && (
                              <Icon
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
                  {TABS.map(({ key, label }) => (
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
                  {activeTab === "details" && (
                    <p>
                      {product.description}
                    </p>
                  )}
                  {activeTab === "how" && (
                    <p>
                      For best results, apply to clean skin morning and evening.
                      Use as directed.
                    </p>
                  )}
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
                Pairs well with
              </span>
              <h2
                style={{
                  fontFamily:
                    "var(--font-serif, 'Cormorant Garamond', serif)",
                  fontWeight: 400,
                  fontSize: "clamp(36px, 4.5vw, 56px)",
                  lineHeight: 1.05,
                  letterSpacing: "-0.01em",
                  color: "var(--el-ink, #1c1a17)",
                }}
              >
                Complete the <em style={{ fontStyle: "italic" }}>ritual</em>.
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
                View all products
                <ArrowRight aria-hidden={true} style={{ width: 14, height: 14 }} />
              </Link>
            </div>
          </div>
        </section>
      )}

    </>
  );
}
