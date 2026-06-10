"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

type ProductFiltersProps = {
  productCount?: number;
};

export function ProductFilters({ productCount }: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const status = searchParams.get("status") ?? "all";
  const sort = searchParams.get("sort") ?? "newest";

  const buildParams = (overrides: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    // Always reset page when filters/sort change
    params.delete("page");
    for (const [key, value] of Object.entries(overrides)) {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    return params.toString();
  };

  const handleStatusChange = (value: string) => {
    const qs = buildParams({ status: value === "all" ? null : value });
    router.push(`/admin/products?${qs}`);
  };

  const handleSortChange = (value: string) => {
    const qs = buildParams({ sort: value === "newest" ? null : value });
    router.push(`/admin/products?${qs}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const qs = buildParams({ search: search || null });
    router.push(`/admin/products?${qs}`);
  };

  const handleClear = () => {
    setSearch("");
    router.push("/admin/products");
  };

  const hasFilters =
    !!searchParams.get("search") ||
    (searchParams.get("status") ?? "all") !== "all" ||
    (searchParams.get("sort") ?? "newest") !== "newest";

  return (
    <div className="mb-6 rounded-lg border bg-white p-4">
      <div className="flex flex-col gap-4 md:flex-row">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name, slug, or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>

        {/* Status Filter */}
        <div className="flex w-full items-center gap-2 md:w-44">
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sort */}
        <div className="flex w-full items-center gap-2 md:w-52">
          <Select value={sort} onValueChange={handleSortChange}>
            <SelectTrigger>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="name-asc">Name A–Z</SelectItem>
              <SelectItem value="name-desc">Name Z–A</SelectItem>
              <SelectItem value="price-asc">Price low–high</SelectItem>
              <SelectItem value="price-desc">Price high–low</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && typeof productCount !== "undefined" && (
            <span className="text-muted-foreground ml-2 text-xs whitespace-nowrap">
              {productCount} found
            </span>
          )}
        </div>

        {/* Clear Filters */}
        {hasFilters && (
          <Button variant="outline" onClick={handleClear}>
            <X className="mr-2 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
