"use client";

import { Search, X } from "lucide-react";

import type { SortOption } from "~/hooks/use-shop-filters";
import type { RouterOutputs } from "~/trpc/react";
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

import { PollenProductCard } from "../shared/pollen-product-card";

type Product = NonNullable<
  RouterOutputs["business"]["getWithProducts"]
>["products"][number];

interface Props {
  products: Product[];
  shopHeading: string;
  shopIntro: string;
}

export function PollenShopFilterClient({ products }: Props) {
  const {
    search,
    setSearch,
    sortParam,
    handleSort,
    currentPage,
    totalPages,
    handlePage,
    paginated,
    filtered,
    hasActiveFilters,
    clearFilters,
  } = useShopFilters(products, { pageSize: 12 });

  return (
    <>
      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          {/* N-1: aria-hidden on decorative Search icon */}
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#4c566a]"
            aria-hidden="true"
          />
          {/* S-6: label the search input */}
          <Input
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Search products"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={sortParam}
            onValueChange={(v) => handleSort(v as SortOption)}
          >
            {/* S-6: label the sort select trigger */}
            <SelectTrigger className="w-48" aria-label="Sort products">
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
              className="gap-1.5 text-[#4c566a]"
            >
              {/* N-1: aria-hidden on decorative X icon */}
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* S-7: visible result count with role="status" */}
      <p
        role="status"
        className="mt-4 text-sm text-[#4c566a]"
      >
        {filtered.length === products.length
          ? `${products.length} ${products.length === 1 ? "product" : "products"}`
          : `${filtered.length} of ${products.length} products`}
      </p>

      {/* Product grid */}
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {paginated.map((product, index) => (
          <PollenProductCard key={product.id} index={index} product={product} />
        ))}
      </div>

      {/* S-7: empty state with role="status" */}
      {paginated.length === 0 && (
        <p role="status" className="py-12 text-center text-sm text-[#4c566a]">
          No products match your search.{" "}
          <button
            onClick={clearFilters}
            className="text-[#215935] underline-offset-2 hover:underline"
          >
            Clear filters
          </button>
        </p>
      )}

      {/* M-9: wrap pagination in <nav aria-label="Pagination"> */}
      {totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          {/* M-9: aria-live + sr-only label on page indicator */}
          <span
            className="text-sm text-[#4c566a]"
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
    </>
  );
}
