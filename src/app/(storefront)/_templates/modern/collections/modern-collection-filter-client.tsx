"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";

import type { Product } from "~/types";
import { formatPrice } from "~/lib/prices";
import { useShopFilters } from "~/hooks/use-shop-filters";

import { ModernProductCard } from "../shared/modern-product-card";

type Props = {
  products: Product[];
};

export function ModernCollectionFilterClient({ products }: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const {
    sortParam,
    handleSort,
    priceMax,
    maxPrice,
    localPriceMax,
    setLocalPriceMax,
    commitPriceMax,
    inStockOnly,
    handleInStock,
    inStockCount,
    filtered,
    hasActiveFilters,
    clearFilters,
  } = useShopFilters(products);

  const activeFilterCount =
    (inStockOnly ? 1 : 0) +
    (priceMax !== null ? 1 : 0) +
    (sortParam !== "featured" ? 1 : 0);

  return (
    <div>
      {/* ── Filter bar ── */}
      <div className="border-border mb-8 border-b pb-5">
        {/* Desktop */}
        <div className="hidden flex-wrap items-center gap-x-5 gap-y-3 md:flex">
          <div className="flex items-center gap-2">
            {/* S-6: real label wired to select id */}
            <label
              htmlFor="col-sort-desktop"
              className="text-muted-foreground cursor-default text-xs font-medium tracking-widest uppercase"
            >
              Sort
            </label>
            <select
              id="col-sort-desktop"
              value={sortParam}
              onChange={(e) =>
                handleSort(e.target.value as Parameters<typeof handleSort>[0])
              }
              className="border-border bg-background text-foreground focus-visible:ring-ring cursor-pointer rounded-sm border px-2 py-1.5 text-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <option value="featured">Featured</option>
              <option value="price-ascending">Price: Low to High</option>
              <option value="price-descending">Price: High to Low</option>
              <option value="title-ascending">Name A–Z</option>
              <option value="newest">Newest</option>
            </select>
          </div>

          <div className="bg-border h-4 w-px" />

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => handleInStock(e.target.checked)}
              className="accent-foreground"
            />
            <span className="text-foreground">In stock</span>
            <span className="text-muted-foreground text-xs">
              ({inStockCount})
            </span>
          </label>

          <div className="bg-border h-4 w-px" />

          <div className="flex min-w-[200px] flex-col gap-1">
            <div className="flex items-center justify-between">
              {/* S-6: real label wired to range id */}
              <label
                htmlFor="col-price-desktop"
                className="text-muted-foreground cursor-default text-xs font-medium tracking-widest uppercase"
              >
                Price
              </label>
              <span className="text-foreground text-xs">
                {formatPrice(localPriceMax)}
              </span>
            </div>
            <input
              id="col-price-desktop"
              type="range"
              min={0}
              max={maxPrice || 1000}
              value={localPriceMax}
              aria-valuetext={formatPrice(localPriceMax)}
              onChange={(e) => setLocalPriceMax(Number(e.target.value))}
              onPointerUp={(e) =>
                commitPriceMax(Number((e.target as HTMLInputElement).value))
              }
              onKeyUp={() => commitPriceMax(localPriceMax)}
              className="accent-foreground w-full"
            />
          </div>

          <div className="ml-auto flex items-center gap-4">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs underline"
              >
                <X className="h-3 w-3" aria-hidden="true" />
                Clear all
              </button>
            )}
            {/* S-8: role="status" for live result count */}
            <span role="status" className="text-muted-foreground text-sm">
              {filtered.length} {filtered.length === 1 ? "product" : "products"}
            </span>
          </div>
        </div>

        {/* Mobile */}
        <div className="md:hidden">
          <div className="flex items-center justify-between">
            {/* S-7: aria-expanded + aria-controls */}
            <button
              type="button"
              aria-expanded={filtersOpen}
              aria-controls="collection-filter-panel"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="border-border text-foreground flex items-center gap-2 rounded-sm border px-3 py-1.5 text-sm"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              Filters &amp; Sort
              {activeFilterCount > 0 && (
                <span className="bg-primary text-primary-foreground flex h-4 w-4 items-center justify-center rounded-full text-[10px]">
                  {activeFilterCount}
                  <span className="sr-only"> active filters</span>
                </span>
              )}
            </button>
            {/* S-8: role="status" for live result count */}
            <span role="status" className="text-muted-foreground text-sm">
              {filtered.length} {filtered.length === 1 ? "product" : "products"}
            </span>
          </div>

          {filtersOpen && (
            <div
              id="collection-filter-panel"
              className="border-border mt-4 flex flex-col gap-5 border-t pt-4"
            >
              <div className="flex flex-col gap-2">
                {/* S-6: real label wired to select id */}
                <label
                  htmlFor="col-sort-mobile"
                  className="text-muted-foreground cursor-default text-xs font-medium tracking-widest uppercase"
                >
                  Sort
                </label>
                <select
                  id="col-sort-mobile"
                  value={sortParam}
                  onChange={(e) =>
                    handleSort(
                      e.target.value as Parameters<typeof handleSort>[0],
                    )
                  }
                  className="border-border bg-background text-foreground focus-visible:ring-ring cursor-pointer rounded-sm border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  <option value="featured">Featured</option>
                  <option value="price-ascending">Price: Low to High</option>
                  <option value="price-descending">Price: High to Low</option>
                  <option value="title-ascending">Name A–Z</option>
                  <option value="newest">Newest</option>
                </select>
              </div>

              <label className="flex cursor-pointer items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => handleInStock(e.target.checked)}
                  className="accent-foreground h-4 w-4"
                />
                <span className="text-foreground">
                  In stock ({inStockCount})
                </span>
              </label>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  {/* S-6: real label wired to range id */}
                  <label
                    htmlFor="col-price-mobile"
                    className="text-muted-foreground cursor-default text-xs font-medium tracking-widest uppercase"
                  >
                    Price
                  </label>
                  <span className="text-foreground text-xs">
                    {formatPrice(localPriceMax)}
                  </span>
                </div>
                <input
                  id="col-price-mobile"
                  type="range"
                  min={0}
                  max={maxPrice || 1000}
                  value={localPriceMax}
                  aria-valuetext={formatPrice(localPriceMax)}
                  onChange={(e) => setLocalPriceMax(Number(e.target.value))}
                  onPointerUp={(e) =>
                    commitPriceMax(Number((e.target as HTMLInputElement).value))
                  }
                  onKeyUp={() => commitPriceMax(localPriceMax)}
                  className="accent-foreground w-full"
                />
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    clearFilters();
                    setFiltersOpen(false);
                  }}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 self-start text-sm underline"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Product grid ── */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-muted-foreground text-lg">
            No products match your filters.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="text-foreground mt-4 inline-block text-sm font-medium underline underline-offset-4 hover:opacity-70"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product, index) => (
            <ModernProductCard
              key={product.id}
              product={product}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  );
}
