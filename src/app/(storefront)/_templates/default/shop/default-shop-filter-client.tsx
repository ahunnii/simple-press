"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";

import type { Product } from "~/types";
import { SORT_LABELS, isInStock, useShopFilters } from "~/hooks/use-shop-filters";

import { DefaultProductCard } from "../shared/default-product-card";

export function DefaultShopFilterClient({ products }: { products: Product[] }) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const {
    sortParam,
    paginated,
    filtered,
    currentPage,
    totalPages,
    handleSort,
    handlePage,
    inStockOnly,
    handleInStock,
    inStockCount,
    activeCollectionId,
    setActiveCollectionId,
    collections,
    clearFilters,
    hasActiveFilters,
  } = useShopFilters(products, { pageSize: 12 });

  const totalInStock = products.filter(isInStock).length;

  const sidebar = (
    <aside aria-label="Product filters" className="flex flex-col divide-y divide-[#e8e8e8]">
      {/* Collections */}
      {collections.length > 0 && (
        <div className="pb-6 pt-0">
          <h2 className="mb-3.5 text-[11px] font-medium tracking-[0.16em] uppercase text-[#6b6b6b]">
            Collection
          </h2>
          <ul className="flex flex-col gap-2">
            <li>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="collection"
                  value=""
                  checked={!activeCollectionId}
                  onChange={() => setActiveCollectionId(null)}
                  className="accent-[#0a0a0a]"
                />
                All
                <span className="ml-auto text-xs text-[#6b6b6b]">
                  {products.length}
                </span>
              </label>
            </li>
            {collections.map((col) => {
              const count = products.filter((p) =>
                (p.collectionProducts ?? []).some(
                  (cp) => cp.collection.id === col.id,
                ),
              ).length;
              return (
                <li key={col.id}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="collection"
                      value={col.id}
                      checked={activeCollectionId === col.id}
                      onChange={() => setActiveCollectionId(col.id)}
                      className="accent-[#0a0a0a]"
                    />
                    {col.name}
                    <span className="ml-auto text-xs text-[#6b6b6b]">
                      {count}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Availability */}
      <div className="py-6">
        <h2 className="mb-3.5 text-[11px] font-medium tracking-[0.16em] uppercase text-[#6b6b6b]">
          Availability
        </h2>
        <ul className="flex flex-col gap-2">
          <li>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => handleInStock(e.target.checked)}
                className="accent-[#0a0a0a]"
              />
              In stock
              <span className="ml-auto text-xs text-[#6b6b6b]">
                {inStockOnly ? inStockCount : totalInStock}
              </span>
            </label>
          </li>
        </ul>
      </div>

      {/* Clear filters */}
      {hasActiveFilters && (
        <div className="pt-6">
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-1.5 text-xs text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Clear filters
          </button>
        </div>
      )}
    </aside>
  );

  return (
    <div>
      {/* Mobile filter toggle */}
      <div className="mb-6 flex items-center justify-between md:hidden">
        <button
          type="button"
          onClick={() => setFiltersOpen(!filtersOpen)}
          aria-expanded={filtersOpen}
          aria-controls="mobile-filters-panel"
          aria-label={hasActiveFilters ? "Filters (active)" : "Filters"}
          className="flex items-center gap-2 border border-[#e8e8e8] rounded-[var(--radius)] px-4 h-10 text-sm font-medium transition-colors hover:border-[#0a0a0a]"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          <span aria-hidden="true">Filters</span>
          {hasActiveFilters && (
            <span className="ml-1 h-1.5 w-1.5 rounded-full bg-[#0a0a0a]" aria-hidden="true" />
          )}
        </button>
        <p className="text-sm text-[#6b6b6b]" aria-live="polite" aria-atomic="true">
          {filtered.length} product{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Mobile filters panel */}
      {filtersOpen && (
        <div id="mobile-filters-panel" className="mb-8 rounded-[var(--radius)] border border-[#e8e8e8] p-5 md:hidden">
          {sidebar}
        </div>
      )}

      {/* Desktop layout: sidebar + grid */}
      <div className="grid grid-cols-1 gap-12 md:grid-cols-[240px_1fr]">
        {/* Sidebar (desktop only) */}
        <div className="hidden md:block">{sidebar}</div>

        {/* Grid area */}
        <div>
          {/* Toolbar */}
          <div className="mb-6 flex items-center justify-between border-b border-[#e8e8e8] pb-4">
            <span className="text-sm text-[#6b6b6b]" aria-live="polite" aria-atomic="true">
              Showing {filtered.length} product
              {filtered.length !== 1 ? "s" : ""}
            </span>
            <label className="flex items-center gap-2 text-sm text-[#6b6b6b]">
              Sort
              <select
                aria-label="Sort products"
                value={sortParam}
                onChange={(e) =>
                  handleSort(e.target.value as keyof typeof SORT_LABELS)
                }
                className="h-9 cursor-pointer appearance-none rounded-[var(--radius)] border border-[#e8e8e8] bg-white px-3 pr-7 text-sm text-[#0a0a0a] transition-colors hover:border-[#0a0a0a] focus:border-[#0a0a0a]"
                style={{
                  backgroundImage:
                    "linear-gradient(45deg,transparent 50%,#0a0a0a 50%),linear-gradient(135deg,#0a0a0a 50%,transparent 50%)",
                  backgroundPosition:
                    "calc(100% - 14px) center,calc(100% - 10px) center",
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

          {/* Product grid */}
          {paginated.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-[#6b6b6b] text-sm">
                No products match your filters.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 text-sm underline hover:no-underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
              {paginated.map((product, index) => (
                <DefaultProductCard
                  key={product.id}
                  product={product}
                  index={index}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav aria-label="Pagination" className="mt-16 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => handlePage(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex h-9 items-center justify-center rounded-[var(--radius)] border border-[#e8e8e8] px-4 text-sm transition-colors hover:border-[#0a0a0a] disabled:opacity-30"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePage(p)}
                  aria-label={`Page ${p}`}
                  aria-current={p === currentPage ? "page" : undefined}
                  className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius)] border text-sm transition-colors ${
                    p === currentPage
                      ? "border-[#0a0a0a] bg-[#0a0a0a] text-white"
                      : "border-[#e8e8e8] hover:border-[#0a0a0a]"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handlePage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex h-9 items-center justify-center rounded-[var(--radius)] border border-[#e8e8e8] px-4 text-sm transition-colors hover:border-[#0a0a0a] disabled:opacity-30"
              >
                Next
              </button>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
