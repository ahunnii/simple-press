"use client";

import type { CSSProperties } from "react";
import { useId } from "react";
import { Search, X } from "lucide-react";

import type { SortOption } from "~/hooks/use-shop-filters";
import type { Product } from "~/types";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";
import { SORT_LABELS, useShopFilters } from "~/hooks/use-shop-filters";

import { DreamInput, DreamSelect } from "../shared/dream-input";
import { DreamReveal } from "../shared/dream-reveal";
import { DreamShopCard } from "./dream-shop-card";

const PAGE_SIZE = 12;

/** Widest grid column count (`lg:grid-cols-3`) — a card's reveal stagger is its column slot. */
const GRID_COLS = 3;

type Props = {
  products: Product[];
  /** `dream.shop.no-results` — shown when filters match nothing. */
  noResults: string;
};

/**
 * Page numbers to render, windowed around the current page with ellipsis
 * gaps: always the first and last page, plus one page either side of the
 * current one (`1 … 4 5 6 … 12`).
 */
export function dreamPageWindow(
  current: number,
  total: number,
): (number | "gap")[] {
  const pages = new Set<number>([1, total, current - 1, current, current + 1]);
  const sorted = [...pages]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((page, i) => {
    const prev = sorted[i - 1];
    if (prev !== undefined && page - prev > 1) out.push("gap");
    out.push(page);
  });
  return out;
}

/**
 * Search / collection / availability / sort toolbar over the dream product
 * grid. All filter, sort, and pagination state comes from the shared
 * `useShopFilters` hook (URL-backed sort, page, and in-stock params) —
 * nothing here re-implements it. Filters sit in one airy row above the
 * grid instead of Default's sidebar: pill toggles on the same
 * `.dream-radio-pill` treatment the estimate form uses, a paper search
 * field, and a native select for sort.
 */
export function DreamShopFilterClient({ products, noResults }: Props) {
  const searchId = useId();
  const sortId = useId();
  const {
    sortParam,
    paginated,
    filtered,
    currentPage,
    totalPages,
    handleSort,
    pageLinkProps,
    inStockOnly,
    handleInStock,
    activeCollectionId,
    setActiveCollectionId,
    collections,
    clearFilters,
    hasActiveFilters,
    search,
    setSearch,
  } = useShopFilters(products, { pageSize: PAGE_SIZE });

  const countLabel =
    filtered.length === products.length
      ? `${products.length} ${products.length === 1 ? "product" : "products"}`
      : `${filtered.length} of ${products.length} products`;

  return (
    <div className="flex flex-col gap-10">
      {/* Toolbar */}
      <div className="flex flex-col gap-5 border-b border-[var(--dream-line)] pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <label htmlFor={searchId} className="sr-only">
              Search products
            </label>
            <Search
              aria-hidden="true"
              strokeWidth={1.5}
              className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[var(--dream-soft)]"
            />
            <DreamInput
              id={searchId}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search the shop"
              autoComplete="off"
              className="!pl-11"
            />
          </div>
          <div className="flex items-center gap-3">
            <label
              htmlFor={sortId}
              className="shrink-0 text-[14px] font-semibold text-[var(--dream-ink)]"
            >
              Sort by
            </label>
            <DreamSelect
              id={sortId}
              value={sortParam}
              onChange={(e) => handleSort(e.target.value as SortOption)}
              className="min-w-[12rem]"
            >
              {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </DreamSelect>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {collections.length > 0 ? (
            <fieldset className="m-0 flex flex-wrap items-center gap-2 border-0 p-0">
              <legend className="sr-only">Collection</legend>
              <label className="dream-radio-pill">
                <input
                  type="radio"
                  name="dream-shop-collection"
                  value=""
                  checked={!activeCollectionId}
                  onChange={() => setActiveCollectionId(null)}
                  className="sr-only"
                />
                <span>All</span>
              </label>
              {collections.map((collection) => (
                <label key={collection.id} className="dream-radio-pill">
                  <input
                    type="radio"
                    name="dream-shop-collection"
                    value={collection.id}
                    checked={activeCollectionId === collection.id}
                    onChange={() => setActiveCollectionId(collection.id)}
                    className="sr-only"
                  />
                  <span>{collection.name}</span>
                </label>
              ))}
            </fieldset>
          ) : null}
          <label className="dream-radio-pill">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => handleInStock(e.target.checked)}
              className="sr-only"
            />
            <span>In stock only</span>
          </label>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="dream-link ml-1 inline-flex items-center gap-1.5 bg-transparent p-0 text-[14px]"
            >
              <X aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
              Clear filters
            </button>
          ) : null}
          <p
            className="ml-auto text-[14px] text-[var(--dream-soft)] tabular-nums"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {countLabel}
          </p>
        </div>
      </div>

      {/* Grid */}
      {paginated.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p
            className="[font-family:var(--font-dream-display)] text-[26px] leading-[1.2] text-[var(--dream-ink)]"
            {...fieldAttr("dream.shop.no-results")}
          >
            {noResults}
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="dream-btn dream-btn--secondary"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <ul className="m-0 grid list-none grid-cols-2 gap-x-4 gap-y-10 p-0 sm:gap-x-6 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-14">
          {paginated.map((product, index) => (
            <li key={product.id} className="min-w-0">
              <DreamReveal
                style={{ "--i": index % GRID_COLS } as CSSProperties}
              >
                <DreamShopCard product={product} priority={index < 3} />
              </DreamReveal>
            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      {totalPages > 1 ? (
        <nav
          aria-label="Pagination"
          className="flex flex-wrap items-center justify-center gap-2 pt-4"
        >
          {currentPage === 1 ? (
            <button
              type="button"
              disabled
              className="dream-btn dream-btn--secondary"
            >
              Previous
            </button>
          ) : (
            <a
              {...pageLinkProps(currentPage - 1)}
              className="dream-btn dream-btn--secondary"
            >
              Previous
            </a>
          )}
          <ol className="m-0 flex list-none items-center gap-1 p-0">
            {dreamPageWindow(currentPage, totalPages).map((page, i) =>
              page === "gap" ? (
                <li
                  key={`gap-${i}`}
                  aria-hidden="true"
                  className="px-1 text-[var(--dream-soft)]"
                >
                  …
                </li>
              ) : (
                <li key={page}>
                  <a
                    {...pageLinkProps(page)}
                    aria-label={`Page ${page}`}
                    aria-current={page === currentPage ? "page" : undefined}
                    className={cn(
                      "grid size-11 place-items-center rounded-full border text-[15px] tabular-nums transition-colors",
                      page === currentPage
                        ? "border-[var(--dream-ink)] bg-[var(--dream-ink)] text-[var(--dream-paper)]"
                        : "border-[var(--dream-line)] bg-transparent text-[var(--dream-ink)] hover:border-[var(--dream-gold)]",
                    )}
                  >
                    {page}
                  </a>
                </li>
              ),
            )}
          </ol>
          {currentPage === totalPages ? (
            <button
              type="button"
              disabled
              className="dream-btn dream-btn--secondary"
            >
              Next
            </button>
          ) : (
            <a
              {...pageLinkProps(currentPage + 1)}
              className="dream-btn dream-btn--secondary"
            >
              Next
            </a>
          )}
        </nav>
      ) : null}
    </div>
  );
}
