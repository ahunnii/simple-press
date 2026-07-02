"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import type { SortOption } from "~/hooks/use-shop-filters";
import type { Product } from "~/types";
import { SORT_LABELS, useShopFilters } from "~/hooks/use-shop-filters";

import { DarkTrendProductCard } from "../shared/dark-trend-product-card";

type Props = {
  products: Product[];
};

export function DarkTrendShopClient({ products }: Props) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();

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

  // Sync search state when ?q= changes externally (e.g. the header search
  // pushes /shop?q=… while this page is already mounted). Skipped while the
  // on-page input is focused so it never fights live typing.
  const qParam = searchParams.get("q") ?? "";
  useEffect(() => {
    if (qParam === search) return;
    if (document.activeElement === searchInputRef.current) return;
    setSearch(qParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qParam]);

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/40"
            aria-hidden="true"
          />
          <input
            ref={searchInputRef}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            aria-label="Search products"
            className="h-10 w-full rounded-md border border-white/10 bg-white/5 pr-3 pl-9 text-sm text-white placeholder:text-white/40 focus:border-[#6A5ACD] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-5">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-white/60">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => handleInStock(e.target.checked)}
              className="h-4 w-4 accent-[#6A5ACD]"
            />
            In stock ({inStockCount})
          </label>

          <label className="flex items-center gap-2 text-sm text-white/60">
            Sort
            <select
              value={sortParam}
              onChange={(e) => handleSort(e.target.value as SortOption)}
              className="h-10 cursor-pointer rounded-md border border-white/10 bg-[#1F1F1F] px-3 text-sm text-white focus:border-[#6A5ACD] focus:outline-none"
            >
              {Object.entries(SORT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-sm text-white/60 transition-colors hover:text-white"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Collection filter */}
      {collections.length > 0 && (
        <div
          role="group"
          aria-label="Filter by collection"
          className="mt-5 flex flex-wrap items-center gap-2"
        >
          <button
            type="button"
            onClick={() => setActiveCollectionId(null)}
            aria-pressed={!activeCollectionId}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold tracking-wider uppercase transition-colors ${
              !activeCollectionId
                ? "border-[#6A5ACD] bg-[#6A5ACD]/20 text-white"
                : "border-white/10 text-white/60 hover:text-white"
            }`}
          >
            All
          </button>
          {collections.map((col) => (
            <button
              key={col.id}
              type="button"
              onClick={() =>
                setActiveCollectionId(
                  activeCollectionId === col.id ? null : col.id,
                )
              }
              aria-pressed={activeCollectionId === col.id}
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold tracking-wider uppercase transition-colors ${
                activeCollectionId === col.id
                  ? "border-[#6A5ACD] bg-[#6A5ACD]/20 text-white"
                  : "border-white/10 text-white/60 hover:text-white"
              }`}
            >
              {col.name}
            </button>
          ))}
        </div>
      )}

      {/* Result count */}
      <p role="status" className="mt-5 mb-6 text-sm text-white/60">
        {filtered.length === products.length
          ? `${products.length} ${products.length === 1 ? "product" : "products"}`
          : `${filtered.length} of ${products.length} products`}
      </p>

      {/* Product grid */}
      {paginated.length === 0 ? (
        <p role="status" className="py-16 text-center text-lg text-white/60">
          No products match your filters.{" "}
          <button
            type="button"
            onClick={clearFilters}
            className="text-white underline underline-offset-4 hover:no-underline"
          >
            Clear filters
          </button>
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {paginated.map((product, index) => (
            <DarkTrendProductCard
              key={product.id}
              index={index}
              product={product}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="mt-12 flex items-center justify-center gap-3"
        >
          <button
            type="button"
            onClick={() => handlePage(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex h-9 items-center rounded-md border border-white/10 px-4 text-sm text-white/80 transition-colors hover:border-white/40 hover:text-white disabled:opacity-30"
          >
            Previous
          </button>
          <span
            className="text-sm text-white/60"
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
            className="flex h-9 items-center rounded-md border border-white/10 px-4 text-sm text-white/80 transition-colors hover:border-white/40 hover:text-white disabled:opacity-30"
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
}
