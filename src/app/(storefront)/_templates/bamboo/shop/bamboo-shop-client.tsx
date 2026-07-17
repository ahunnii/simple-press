"use client";

import { Search, X } from "lucide-react";

import type { SortOption } from "~/hooks/use-shop-filters";
import type { Product } from "~/types";
import { SORT_LABELS, useShopFilters } from "~/hooks/use-shop-filters";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { StaggerContainer, StaggerItem } from "~/components/page-animations";

import { BambooProductCard } from "../shared/bamboo-product-card";

type Props = {
  products: Product[];
};

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
      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-card pl-9"
            aria-label="Search products"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="text-muted-foreground flex cursor-pointer items-center gap-2 font-sans text-sm">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => handleInStock(e.target.checked)}
              className="accent-primary h-4 w-4"
            />
            In stock ({inStockCount})
          </label>

          <Select
            value={sortParam}
            onValueChange={(v) => handleSort(v as SortOption)}
          >
            <SelectTrigger className="bg-card w-48" aria-label="Sort products">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(
                ([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground gap-1.5"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Collection filter */}
      {collections.length > 0 && (
        <div
          role="group"
          aria-label="Filter by collection"
          className="mt-4 flex flex-wrap items-center gap-2"
        >
          <button
            type="button"
            onClick={() => setActiveCollectionId(null)}
            aria-pressed={!activeCollectionId}
            className={`rounded-full border px-4 py-1.5 font-sans text-xs font-medium transition-colors ${
              !activeCollectionId
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
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
              className={`rounded-full border px-4 py-1.5 font-sans text-xs font-medium transition-colors ${
                activeCollectionId === col.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {col.name}
            </button>
          ))}
        </div>
      )}

      {/* Result count */}
      <p role="status" className="text-muted-foreground mt-4 font-sans text-sm">
        {filtered.length === products.length
          ? `${products.length} ${products.length === 1 ? "product" : "products"}`
          : `${filtered.length} of ${products.length} products`}
      </p>

      {/* Product grid */}
      {paginated.length === 0 ? (
        <p
          role="status"
          className="text-muted-foreground py-16 text-center font-sans"
        >
          No products match your filters.{" "}
          <button
            type="button"
            onClick={clearFilters}
            className="text-primary underline underline-offset-4 hover:no-underline"
          >
            Clear filters
          </button>
        </p>
      ) : (
        <StaggerContainer
          key={paginated.map((p) => p.id).join(",")}
          className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          staggerDelay={0.12}
        >
          {paginated.map((product, index) => (
            <StaggerItem key={product.id}>
              <BambooProductCard index={index} product={product} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="mt-10 flex items-center justify-center gap-3"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span
            className="text-muted-foreground font-sans text-sm"
            aria-live="polite"
            aria-label={`Page ${currentPage} of ${totalPages}`}
          >
            <span className="sr-only">Page </span>
            {currentPage}
            <span aria-hidden="true"> / </span>
            <span className="sr-only"> of </span>
            {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </nav>
      )}
    </div>
  );
}
