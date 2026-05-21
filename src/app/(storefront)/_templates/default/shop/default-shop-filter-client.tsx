"use client";

import type { Product } from "~/types";
import { SORT_LABELS, useShopFilters } from "~/hooks/use-shop-filters";
import { Label } from "~/components/ui/label";

import { DefaultProductCard } from "../shared/default-product-card";

export function DefaultShopFilterClient({ products }: { products: Product[] }) {
  const {
    sortParam,
    paginated,
    currentPage,
    totalPages,
    handleSort,
    handlePage,
  } = useShopFilters(products, { pageSize: 12 });

  return (
    <div>
      <div className="mb-4 flex items-center justify-end">
        <Label className="mr-2 text-sm text-gray-600">Sort by: </Label>
        <select
          aria-label="Sort products"
          value={sortParam}
          onChange={(e) =>
            handleSort(e.target.value as keyof typeof SORT_LABELS)
          }
          className="cursor-pointer border-0 bg-transparent text-sm text-gray-600 focus:outline-none"
        >
          {Object.entries(SORT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <p className="pl-6 text-sm font-medium text-gray-600">
          {products?.length} product
          {products?.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {paginated.map((product, index) => (
          <DefaultProductCard
            key={product.id}
            product={product}
            index={index}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => handlePage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm text-gray-600 disabled:opacity-30"
          >
            ←
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handlePage(p)}
              className={`px-3 py-1 text-sm ${
                p === currentPage
                  ? "font-semibold text-gray-900"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handlePage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm text-gray-600 disabled:opacity-30"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
