"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowUpDown, Search } from "lucide-react";

import type { DefaultProductsPageTemplateProps } from "../../types";
import type { SortOption } from "~/hooks/use-shop-filters";
import { useShopFilters } from "~/hooks/use-shop-filters";
import { useReducedMotion } from "~/hooks/use-reduced-motion";

import { ElegantProductCard } from "../shared/elegant-product-card";

const easeOut = "cubic-bezier(0.16, 1, 0.3, 1)";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "title-ascending", label: "Name · A–Z" },
  { value: "title-descending", label: "Name · Z–A" },
  { value: "price-ascending", label: "Price · low to high" },
  { value: "price-descending", label: "Price · high to low" },
  { value: "newest", label: "Newest" },
];

const monoLabelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono, ui-monospace)",
  fontSize: 11,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--el-ink-soft, #6b6659)",
};

export function ElegantShopClient({
  business,
}: DefaultProductsPageTemplateProps) {
  const [shown, setShown] = useState(false);
  const [gridVisible, setGridVisible] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const reducedMotion = useReducedMotion();
  const searchParams = useSearchParams();

  const allProducts = business.products ?? [];

  const {
    search,
    setSearch,
    sortParam,
    handleSort,
    filtered,
    hasActiveFilters,
    clearFilters,
  } = useShopFilters(allProducts);

  // Sync search state when ?q= changes externally (e.g. the header search
  // overlay pushes /shop?q=… while this page is already mounted). Skipped
  // while the on-page input is focused so it never fights live typing.
  const qParam = searchParams.get("q") ?? "";
  useEffect(() => {
    if (qParam === search) return;
    if (document.activeElement === searchInputRef.current) return;
    setSearch(qParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qParam]);

  useEffect(() => {
    const t = setTimeout(() => setShown(true), 60);
    return () => clearTimeout(t);
  }, []);

  const hasResults = filtered.length > 0;
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
  }, [hasResults]);

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
            <span role="status" style={monoLabelStyle}>
              {filtered.length === allProducts.length
                ? `${filtered.length} ${filtered.length === 1 ? "product" : "products"}`
                : `${filtered.length} of ${allProducts.length} products`}
            </span>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 24,
              }}
            >
              {/* Search */}
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "text",
                }}
              >
                <Search
                  aria-hidden={true}
                  style={{
                    width: 13,
                    height: 13,
                    color: "var(--el-ink-soft, #6b6659)",
                  }}
                />
                <span style={monoLabelStyle}>Search</span>
                <input
                  ref={searchInputRef}
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products…"
                  style={{
                    border: 0,
                    borderBottom:
                      "1px solid var(--el-line, rgba(28,26,23,0.12))",
                    background: "transparent",
                    fontSize: 13,
                    padding: "4px 2px",
                    width: 180,
                    color: "var(--el-ink, #1c1a17)",
                    fontFamily: "var(--font-sans, sans-serif)",
                  }}
                />
              </label>

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
                <span style={monoLabelStyle}>Sort</span>
                <select
                  value={sortParam}
                  onChange={(e) => handleSort(e.target.value as SortOption)}
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
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              {/* Clear filters */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  style={{
                    ...monoLabelStyle,
                    border: 0,
                    background: "transparent",
                    cursor: "pointer",
                    textDecoration: "underline",
                    textUnderlineOffset: 3,
                    padding: "4px 0",
                  }}
                >
                  Clear
                </button>
              )}
            </div>
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
          {filtered.length === 0 ? (
            <div
              role="status"
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
                {allProducts.length === 0
                  ? "Nothing here yet."
                  : "Nothing matches."}
              </p>
              <p
                style={{
                  fontFamily: "var(--font-sans, sans-serif)",
                  fontSize: 15,
                }}
              >
                {allProducts.length === 0 ? (
                  "Products will appear here once added."
                ) : (
                  <>
                    Try a different search, or{" "}
                    <button
                      type="button"
                      onClick={clearFilters}
                      style={{
                        border: 0,
                        background: "transparent",
                        cursor: "pointer",
                        font: "inherit",
                        color: "var(--el-ink, #1c1a17)",
                        textDecoration: "underline",
                        textUnderlineOffset: 3,
                        padding: 0,
                      }}
                    >
                      clear your filters
                    </button>
                    .
                  </>
                )}
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
              {filtered.map((product, index) => (
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
