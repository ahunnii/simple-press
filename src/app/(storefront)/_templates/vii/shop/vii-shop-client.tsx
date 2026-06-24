"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import type { Product } from "~/types";
import { SORT_LABELS, useShopFilters } from "~/hooks/use-shop-filters";

import { useViiReveal } from "../hooks/use-vii-reveal";
import { ViiProductCard } from "../shared/vii-product-card";

type Collections = RouterOutputs["collections"]["getAllPublic"];

type Props = {
  products: Product[];
  collections: Collections;
  collectionsOverline: string;
  collectionsHeading: string;
};

export function ViiShopClient({
  products,
  collections,
  collectionsOverline,
  collectionsHeading,
}: Props) {
  const {
    sortParam,
    handleSort,
    currentPage,
    totalPages,
    handlePage,
    inStockOnly,
    handleInStock,
    filtered,
    paginated,
  } = useShopFilters(products, { pageSize: 12 });

  const { ref, visible } = useViiReveal(0.05);

  const hairline = "1px solid var(--vii-hairline)";

  return (
    <>
      {/* Products */}
      <section
        aria-labelledby="vii-shop-products-heading"
        style={{
          background: "var(--vii-paper)",
          padding:
            "clamp(40px, 6vw, 72px) clamp(24px, 6vw, 96px) clamp(64px, 9vw, 112px)",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <h2 id="vii-shop-products-heading" className="sr-only">
            Products
          </h2>
          {products.length === 0 ? (
            <div
              style={{
                padding: "clamp(48px, 8vw, 96px) 0",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 16,
                  color: "var(--vii-ink-soft)",
                }}
              >
                No products available at this time.
              </p>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  paddingBottom: "clamp(16px, 2vw, 22px)",
                  marginBottom: "clamp(28px, 4vw, 44px)",
                  borderBottom: hairline,
                }}
              >
                <span
                  aria-live="polite"
                  aria-atomic="true"
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--vii-ink-soft)",
                  }}
                >
                  {filtered.length} product{filtered.length !== 1 ? "s" : ""}
                </span>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "clamp(16px, 3vw, 28px)",
                  }}
                >
                  {/* In-stock toggle */}
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      color: "var(--vii-navy)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={inStockOnly}
                      onChange={(e) => handleInStock(e.target.checked)}
                      style={{
                        accentColor: "var(--vii-copper)",
                        width: 15,
                        height: 15,
                      }}
                    />
                    In stock only
                  </label>

                  {/* Sort */}
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      color: "var(--vii-ink-soft)",
                    }}
                  >
                    Sort
                    <select
                      aria-label="Sort products"
                      value={sortParam}
                      onChange={(e) =>
                        handleSort(e.target.value as keyof typeof SORT_LABELS)
                      }
                      style={{
                        height: 44,
                        cursor: "pointer",
                        appearance: "none",
                        borderRadius: "var(--radius)",
                        border: "1px solid var(--vii-hairline-strong)",
                        background: "var(--vii-paper)",
                        padding: "0 30px 0 12px",
                        fontFamily: "var(--font-sans)",
                        fontSize: 13,
                        color: "var(--vii-navy)",
                        backgroundImage:
                          "linear-gradient(45deg,transparent 50%,var(--vii-navy) 50%),linear-gradient(135deg,var(--vii-navy) 50%,transparent 50%)",
                        backgroundPosition:
                          "calc(100% - 15px) center,calc(100% - 11px) center",
                        backgroundSize: "4px 4px",
                        backgroundRepeat: "no-repeat",
                      }}
                    >
                      {Object.entries(SORT_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              {/* Grid */}
              {paginated.length === 0 ? (
                <div
                  style={{
                    padding: "clamp(40px, 6vw, 72px) 0",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 15,
                      color: "var(--vii-ink-soft)",
                    }}
                  >
                    No products match your filters.
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(220px, 1fr))",
                    gap: "clamp(20px, 3vw, 36px)",
                  }}
                >
                  {paginated.map((product, index) => (
                    <ViiProductCard
                      key={product.id}
                      product={product}
                      index={index}
                    />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <nav
                  aria-label="Pagination"
                  style={{
                    marginTop: "clamp(40px, 6vw, 64px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <ViiPageButton
                    onClick={() => handlePage(currentPage - 1)}
                    disabled={currentPage === 1}
                    wide
                  >
                    Previous
                  </ViiPageButton>
                  {(() => {
                    // Build windowed page list: first, last, current ± 1, with ellipsis gaps
                    const pages: (
                      | number
                      | "ellipsis-start"
                      | "ellipsis-end"
                    )[] = [];
                    const delta = 1;
                    const rangeStart = Math.max(2, currentPage - delta);
                    const rangeEnd = Math.min(
                      totalPages - 1,
                      currentPage + delta,
                    );

                    pages.push(1);
                    if (rangeStart > 2) pages.push("ellipsis-start");
                    for (let p = rangeStart; p <= rangeEnd; p++) pages.push(p);
                    if (rangeEnd < totalPages - 1) pages.push("ellipsis-end");
                    if (totalPages > 1) pages.push(totalPages);

                    return pages.map((p) => {
                      if (p === "ellipsis-start" || p === "ellipsis-end") {
                        return (
                          <span
                            key={p}
                            aria-hidden="true"
                            style={{
                              height: 44,
                              minWidth: 44,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontFamily: "var(--font-sans)",
                              fontSize: 13,
                              color: "var(--vii-ink-soft)",
                            }}
                          >
                            …
                          </span>
                        );
                      }
                      return (
                        <ViiPageButton
                          key={p}
                          onClick={() => handlePage(p)}
                          active={p === currentPage}
                          ariaLabel={`Page ${p}`}
                          ariaCurrent={p === currentPage}
                        >
                          {p}
                        </ViiPageButton>
                      );
                    });
                  })()}
                  <ViiPageButton
                    onClick={() => handlePage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    wide
                  >
                    Next
                  </ViiPageButton>
                </nav>
              )}
            </>
          )}
        </div>
      </section>

      {/* Collections strip */}
      {collectionsHeading.trim() && collections.length > 0 && (
        <section
          aria-labelledby="vii-shop-collections-heading"
          style={{
            background: "var(--vii-cream)",
            padding: "clamp(64px, 9vw, 112px) clamp(24px, 6vw, 96px)",
          }}
        >
          <div
            ref={ref}
            className={`vii-reveal${visible ? " is-visible" : ""}`}
            style={{ maxWidth: 1200, margin: "0 auto" }}
          >
            <div style={{ marginBottom: "clamp(28px, 4vw, 48px)" }}>
              {collectionsOverline && (
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    letterSpacing: "0.24em",
                    textTransform: "uppercase",
                    fontWeight: 500,
                    color: "var(--vii-ink-soft)",
                    margin: "0 0 6px",
                  }}
                >
                  {collectionsOverline}
                </p>
              )}
              <h2
                id="vii-shop-collections-heading"
                style={{
                  fontFamily: "var(--font-serif)",
                  fontWeight: 400,
                  fontSize: "clamp(26px, 3.6vw, 44px)",
                  lineHeight: 1.1,
                  color: "var(--vii-navy)",
                  margin: 0,
                }}
              >
                {collectionsHeading}
              </h2>
              <div
                aria-hidden="true"
                style={{
                  height: 1,
                  background: "var(--vii-hairline)",
                  marginTop: "clamp(16px, 2vw, 22px)",
                }}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: "clamp(20px, 3vw, 36px)",
              }}
            >
              {collections.map((collection) => (
                <Link
                  key={collection.id}
                  href={`/collections/${collection.slug}`}
                  className="group"
                  style={{ display: "block", textDecoration: "none" }}
                >
                  <div
                    style={{
                      position: "relative",
                      aspectRatio: "4 / 3",
                      overflow: "hidden",
                      borderRadius: "var(--radius)",
                      background: "var(--vii-paper)",
                      marginBottom: 14,
                    }}
                  >
                    <Image
                      src={collection.imageUrl ?? "/placeholder.svg"}
                      alt=""
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      sizes="(max-width: 640px) 100vw, 33vw"
                    />
                  </div>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <h3
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontWeight: 500,
                        fontSize: 18,
                        color: "var(--vii-navy)",
                        margin: 0,
                      }}
                      className="transition-opacity group-hover:opacity-70"
                    >
                      {collection.name}
                    </h3>
                    <ArrowRight
                      aria-hidden="true"
                      style={{
                        width: 15,
                        height: 15,
                        color: "var(--vii-copper)",
                      }}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </div>
                  <p
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      color: "var(--vii-ink-soft)",
                      margin: "4px 0 0",
                    }}
                  >
                    {collection._count.collectionProducts} product
                    {collection._count.collectionProducts !== 1 ? "s" : ""}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function ViiPageButton({
  children,
  onClick,
  disabled,
  active,
  wide,
  ariaLabel,
  ariaCurrent,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  wide?: boolean;
  ariaLabel?: string;
  ariaCurrent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-current={ariaCurrent ? "page" : undefined}
      style={{
        height: 44,
        minWidth: wide ? undefined : 44,
        padding: wide ? "0 18px" : 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "var(--radius)",
        border: active
          ? "1px solid var(--vii-copper-deep)"
          : "1px solid var(--vii-hairline-strong)",
        background: active ? "var(--vii-copper-deep)" : "transparent",
        color: active ? "var(--vii-paper)" : "var(--vii-navy)",
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.3 : 1,
        transition: "border-color 0.2s, background 0.2s",
      }}
    >
      {children}
    </button>
  );
}
