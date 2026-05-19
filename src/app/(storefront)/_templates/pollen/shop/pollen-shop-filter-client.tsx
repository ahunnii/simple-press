"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import type { SortOption } from "~/hooks/use-shop-sort";
import type { RouterOutputs } from "~/trpc/react";
import { SORT_LABELS, useShopSort } from "~/hooks/use-shop-sort";
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
  const [search, setSearch] = useState("");
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(
    null,
  );

  const filteredProducts = useMemo(() => {
    let result = products;

    if (activeCollectionId) {
      result = result.filter((p) =>
        p.collectionProducts.some(
          (cp) => cp.collection.id === activeCollectionId,
        ),
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q),
      );
    }

    return result;
  }, [products, search, activeCollectionId]);

  const {
    sortParam,
    paginated,
    currentPage,
    totalPages,
    handleSort,
    handlePage,
  } = useShopSort(filteredProducts);

  const hasActiveFilters =
    search.trim() !== "" ||
    activeCollectionId !== null ||
    sortParam !== "featured";

  function clearFilters() {
    setSearch("");
    setActiveCollectionId(null);
    handleSort("featured");
  }

  return (
    <>
      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#4c566a]" />
          <Input
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={sortParam}
            onValueChange={(v) => handleSort(v as SortOption)}
          >
            <SelectTrigger className="w-48">
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
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Product grid */}
      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {paginated.map((product, index) => (
          <PollenProductCard key={product.id} index={index} product={product} />
        ))}
      </div>

      {paginated.length === 0 && (
        <p className="py-12 text-center text-sm text-[#4c566a]">
          No products match your search.{" "}
          <button
            onClick={clearFilters}
            className="text-[#215935] underline-offset-2 hover:underline"
          >
            Clear filters
          </button>
        </p>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-[#4c566a]">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </>
  );
}
