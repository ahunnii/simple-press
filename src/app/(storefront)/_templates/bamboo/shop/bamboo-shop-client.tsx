"use client";

import type { CSSProperties } from "react";
import { ChevronDown, Search, X } from "lucide-react";

import type { SortOption } from "~/hooks/use-shop-filters";
import type { Product } from "~/types";
import { SORT_LABELS, useShopFilters } from "~/hooks/use-shop-filters";

import { BambooGlyph } from "../shared/bamboo-glyph";
import { BambooProductCard } from "../shared/bamboo-product-card";
import { BambooReveal, BambooRevealGroup } from "../shared/bamboo-reveal";

type Props = {
  products: Product[];
};

/**
 * Toolbar + product grid — restyled to the card system's `.bamboo-chip` pills
 * and a native `<select>` with an overlaid chevron (mockup:
 * mockup-b-shop.elided.html lines ~970-990). ALL of `useShopFilters`' state
 * wiring is kept exactly (search, in-stock, collection filter, sort,
 * pagination) — the mockup itself only shows chips + sort, but this template
 * must keep working for a catalog far larger than the pilot tenant's single
 * product, so the search box and in-stock toggle stay, just reskinned into
 * the same toolbar.
 */
export function BambooShopClient({ products }: Props) {
  const {
    search,
    setSearch,
    sortParam,
    handleSort,
    inStockOnly,
    handleInStock,
    inStockCount,
    activeCollectionId,
    setActiveCollectionId,
    collections,
    currentPage,
    totalPages,
    handlePage,
    filtered,
    paginated,
    hasActiveFilters,
    clearFilters,
  } = useShopFilters(products, { pageSize: 12 });

  return (
    <div>
      {/* Toolbar */}
      <BambooReveal className="flex flex-col gap-4 border-b border-[var(--bamboo-outline)] pb-[22px]">
        <div className="flex flex-wrap items-center gap-4">
          {collections.length > 0 && (
            <ul
              className="m-0 flex list-none flex-wrap gap-2.5 p-0"
              aria-label="Filter by collection"
            >
              <li>
                <button
                  type="button"
                  className="bamboo-chip"
                  aria-pressed={!activeCollectionId}
                  onClick={() => setActiveCollectionId(null)}
                >
                  All
                </button>
              </li>
              {collections.map((col) => (
                <li key={col.id}>
                  <button
                    type="button"
                    className="bamboo-chip"
                    aria-pressed={activeCollectionId === col.id}
                    onClick={() =>
                      setActiveCollectionId(
                        activeCollectionId === col.id ? null : col.id,
                      )
                    }
                  >
                    {col.name}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="ml-auto flex flex-wrap items-center gap-4">
            <div className="relative">
              <label htmlFor="bamboo-shop-search" className="sr-only">
                Search products
              </label>
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[var(--bamboo-muted)]"
                aria-hidden="true"
              />
              <input
                id="bamboo-shop-search"
                type="search"
                placeholder="Search products…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-[190px] rounded-full border-2 border-[var(--bamboo-outline)] bg-[var(--bamboo-roll)] py-2 pr-4 pl-9 text-[0.92rem] text-[var(--bamboo-ink)] transition-colors outline-none placeholder:text-[var(--bamboo-muted)] focus-visible:border-[var(--bamboo-pine)]"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-[0.9rem] text-[var(--bamboo-ink-soft)]">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => handleInStock(e.target.checked)}
                className="h-4 w-4 accent-[var(--bamboo-pine)]"
              />
              In stock ({inStockCount})
            </label>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="bamboo-swipe inline-flex items-center gap-1 text-[0.9rem] text-[var(--bamboo-terracotta-deep)]"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <p
            role="status"
            className="text-[0.95rem] text-[var(--bamboo-ink-soft)]"
          >
            <b className="font-heading font-bold text-[var(--bamboo-pine)]">
              {filtered.length} {filtered.length === 1 ? "product" : "products"}
            </b>
            {filtered.length !== products.length
              ? ` of ${products.length}`
              : null}
          </p>

          <span className="relative inline-flex items-center">
            <label htmlFor="bamboo-shop-sort" className="sr-only">
              Sort products
            </label>
            <select
              id="bamboo-shop-sort"
              value={sortParam}
              onChange={(e) => handleSort(e.target.value as SortOption)}
              className="appearance-none rounded-full border-2 border-[var(--bamboo-outline)] bg-[var(--bamboo-roll)] py-2 pr-10 pl-4 text-[0.95rem] font-medium text-[var(--bamboo-pine)] transition-colors hover:border-[var(--bamboo-sage-deep)]"
            >
              {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
            <ChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute right-3 h-3 w-3 text-[var(--bamboo-pine)]"
            />
          </span>
        </div>
      </BambooReveal>

      {/* Product grid */}
      {paginated.length === 0 ? (
        <BambooReveal className="mt-[52px]">
          <div className="bamboo-torn-card mx-auto flex max-w-[560px] flex-col items-center gap-4 px-8 py-14 text-center">
            <BambooGlyph id="s-sprig" className="h-auto w-[104px]" />
            <p className="text-[1.05rem] text-[var(--bamboo-ink-soft)]">
              No products match your filters.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="bamboo-btn bamboo-btn-primary"
            >
              Clear filters
            </button>
          </div>
        </BambooReveal>
      ) : (
        <BambooRevealGroup
          key={paginated.map((p) => p.id).join(",")}
          className="mt-[44px] grid grid-cols-1 items-stretch gap-[22px] sm:grid-cols-2 lg:grid-cols-3"
        >
          {paginated.map((product, index) => (
            <div
              key={product.id}
              className="bamboo-reveal-item"
              style={{ "--i": index } as CSSProperties}
            >
              <BambooProductCard index={index} product={product} />
            </div>
          ))}
        </BambooRevealGroup>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="mt-10 flex items-center justify-center gap-3"
        >
          <button
            type="button"
            onClick={() => handlePage(currentPage - 1)}
            disabled={currentPage === 1}
            className="bamboo-btn bamboo-btn-ghost disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <span
            className="text-[0.95rem] text-[var(--bamboo-ink-soft)]"
            aria-live="polite"
            aria-label={`Page ${currentPage} of ${totalPages}`}
          >
            <span className="sr-only">Page </span>
            {currentPage}
            <span aria-hidden="true"> / </span>
            <span className="sr-only"> of </span>
            {totalPages}
          </span>
          <button
            type="button"
            onClick={() => handlePage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="bamboo-btn bamboo-btn-ghost disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
}
