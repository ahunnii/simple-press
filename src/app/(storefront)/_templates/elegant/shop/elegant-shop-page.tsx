"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpDown } from "lucide-react";

import type { DefaultProductsPageTemplateProps } from "../../types";
import { useReducedMotion } from "~/hooks/use-reduced-motion";

import { ElegantProductCard } from "../shared/elegant-product-card";

const easeOut = "cubic-bezier(0.16, 1, 0.3, 1)";

type SortKey = "featured" | "name" | "price-asc" | "price-desc";

export function ElegantShopPage({
  business,
}: DefaultProductsPageTemplateProps) {
  const [shown, setShown] = useState(false);
  const [gridVisible, setGridVisible] = useState(false);
  const [sort, setSort] = useState<SortKey>("featured");
  const gridRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const t = setTimeout(() => setShown(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setGridVisible(true);
      },
      { threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const allProducts = business.products ?? [];

  const sorted = [...allProducts].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "price-asc") return a.price - b.price;
    if (sort === "price-desc") return b.price - a.price;
    return 0;
  });

  const revealStyle = (delay: number): React.CSSProperties =>
    reducedMotion
      ? {}
      : {
          opacity: shown ? 1 : 0,
          transform: shown ? "translateY(0)" : "translateY(24px)",
          transition: `opacity 0.9s ${easeOut} ${delay}s, transform 0.9s ${easeOut} ${delay}s`,
        };

  return (
    <div>
      {/* ── Page hero ── */}
      <section
        style={{
          padding: "48px 40px 0",
          background: "var(--el-cream, #f5f1ea)",
        }}
      >
        <div style={{ maxWidth: 1360, margin: "0 auto" }}>
          <div style={revealStyle(0)}>
            <span
              style={{
                fontFamily: "var(--font-mono, ui-monospace)",
                fontSize: 11,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--el-ink-soft, #6b6659)",
              }}
            >
              The shop · {allProducts.length}{" "}
              {allProducts.length === 1 ? "item" : "items"}
            </span>
          </div>

          <h1
            style={{
              fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
              fontWeight: 400,
              fontSize: "clamp(52px, 8vw, 104px)",
              lineHeight: 0.95,
              letterSpacing: "-0.01em",
              marginTop: 16,
              color: "var(--el-ink, #1c1a17)",
            }}
          >
            {/* Two separate mask-reveal lines, matching the design exactly */}
            <span style={{ display: "block", overflow: "hidden" }}>
              <span
                style={
                  reducedMotion
                    ? { display: "block" }
                    : {
                        display: "block",
                        transform: shown ? "translateY(0)" : "translateY(110%)",
                        transition: `transform 1.1s ${easeOut} 0.08s`,
                      }
                }
              >
                Everything,
              </span>
            </span>
            <span style={{ display: "block", overflow: "hidden" }}>
              <em
                style={
                  reducedMotion
                    ? { display: "block", fontStyle: "italic" }
                    : {
                        display: "block",
                        fontStyle: "italic",
                        transform: shown ? "translateY(0)" : "translateY(110%)",
                        transition: `transform 1.1s ${easeOut} 0.2s`,
                      }
                }
              >
                quietly considered.
              </em>
            </span>
          </h1>

          <div style={revealStyle(0.45)}>
            <p
              style={{
                marginTop: 20,
                color: "var(--el-ink-soft, #6b6659)",
                maxWidth: 540,
                fontSize: 17,
                lineHeight: 1.65,
                fontFamily: "var(--font-sans, sans-serif)",
              }}
            >
              {`Discover what ${business?.name ?? "we"} has to offer.`}
            </p>
          </div>
        </div>
      </section>

      {/* ── Filter / sort bar ── */}
      <section
        style={{
          padding: "32px 40px",
          background: "var(--el-cream, #f5f1ea)",
        }}
      >
        <div style={{ maxWidth: 1360, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 16,
              paddingBottom: 24,
              borderBottom: "1px solid var(--el-line, rgba(28,26,23,0.12))",
            }}
          >
            {/* Product count */}
            <span
              style={{
                fontFamily: "var(--font-mono, ui-monospace)",
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--el-ink-soft, #6b6659)",
              }}
            >
              {sorted.length} {sorted.length === 1 ? "product" : "products"}
            </span>

            {/* Sort */}
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
              }}
            >
              <ArrowUpDown
                aria-hidden={true}
                style={{
                  width: 13,
                  height: 13,
                  color: "var(--el-ink-soft, #6b6659)",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-mono, ui-monospace)",
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--el-ink-soft, #6b6659)",
                }}
              >
                Sort
              </span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="el-shop-sort-select"
                style={{
                  border: 0,
                  background: "transparent",
                  fontSize: 13,
                  padding: "4px 4px",
                  cursor: "pointer",
                  color: "var(--el-ink, #1c1a17)",
                  fontFamily: "var(--font-sans, sans-serif)",
                }}
              >
                <option value="featured">Featured</option>
                <option value="name">Name · A–Z</option>
                <option value="price-asc">Price · low to high</option>
                <option value="price-desc">Price · high to low</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      {/* ── Product grid ── */}
      <section
        style={{
          padding: "24px 40px 80px",
          background: "var(--el-cream, #f5f1ea)",
        }}
      >
        <div style={{ maxWidth: 1360, margin: "0 auto" }}>
          {sorted.length === 0 ? (
            <div
              style={{
                padding: "80px 0",
                textAlign: "center",
                color: "var(--el-ink-soft, #6b6659)",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-serif, serif)",
                  fontSize: 32,
                  color: "var(--el-ink, #1c1a17)",
                  marginBottom: 10,
                }}
              >
                Nothing here yet.
              </p>
              <p
                style={{
                  fontFamily: "var(--font-sans, sans-serif)",
                  fontSize: 15,
                }}
              >
                Products will appear here once added.
              </p>
            </div>
          ) : (
            <div
              ref={gridRef}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 36,
              }}
            >
              {sorted.map((product, index) => (
                <ElegantProductCard
                  key={product.id}
                  product={product}
                  index={index}
                  isVisible={gridVisible}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
