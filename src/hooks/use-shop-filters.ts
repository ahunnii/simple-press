"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { Product } from "~/types";
import { getEffectivePrice } from "~/lib/prices";

export type SortOption =
  | "featured"
  | "title-ascending"
  | "title-descending"
  | "price-ascending"
  | "price-descending"
  | "newest";

export const SORT_LABELS: Record<SortOption, string> = {
  featured: "Featured",
  "title-ascending": "A → Z",
  "title-descending": "Z → A",
  "price-ascending": "Price, Low to High",
  "price-descending": "Price,  High to Low",
  newest: "Newest",
};

export function isInStock(p: Product): boolean {
  if (!p.trackInventory) return true;
  if (p.allowBackorders) return true;
  if (p.baseInventoryUnit) {
    return (
      p.baseInventoryUnit.allowBackorders ||
      p.baseInventoryUnit.inventoryQty > 0
    );
  }
  if (p.variants.length > 0) {
    return p.variants.some((v) => v.inventoryQty > 0);
  }
  return (p.inventoryQty ?? 0) > 0;
}

export function useShopFilters(
  products: Product[],
  options?: { pageSize?: number },
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageSize = options?.pageSize ?? 0;

  // URL params
  const sort = (searchParams.get("sort_by") ?? "featured") as SortOption;
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const priceMaxParam = searchParams.get("price_max");
  const priceMax = priceMaxParam !== null ? Number(priceMaxParam) : null;
  const inStockOnly = searchParams.get("in_stock") === "1";

  // Computed from products
  const maxPrice = useMemo(
    () => Math.max(...products.map((p) => p.price ?? 0), 0),
    [products],
  );

  // Local state: slider thumb (deferred URL commit) + ephemeral filters
  const [localPriceMax, setLocalPriceMax] = useState<number>(
    () => priceMax ?? maxPrice,
  );
  const [search, setSearchRaw] = useState<string>(
    () => searchParams.get("q") ?? "",
  );
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(
    null,
  );

  const collections = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; slug: string }>();
    for (const product of products) {
      for (const cp of product.collectionProducts ?? []) {
        if (!seen.has(cp.collection.id)) {
          seen.set(cp.collection.id, cp.collection);
        }
      }
    }
    return Array.from(seen.values());
  }, [products]);

  // Count in-stock products from the subset that passes all other active filters
  const inStockCount = useMemo(() => {
    let list = [...products];
    if (priceMax !== null)
      list = list.filter((p) => (p.price ?? 0) <= priceMax);
    if (activeCollectionId) {
      list = list.filter((p) =>
        (p.collectionProducts ?? []).some(
          (cp) => cp.collection.id === activeCollectionId,
        ),
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q),
      );
    }
    return list.filter(isInStock).length;
  }, [products, priceMax, activeCollectionId, search]);

  useEffect(() => {
    setLocalPriceMax(priceMax ?? maxPrice);
  }, [priceMax, maxPrice]);

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    const qs = params.toString();
    router.replace(pathname + (qs ? "?" + qs : ""), { scroll: false });
  }

  function handleSort(value: SortOption) {
    updateParams({ sort_by: value === "featured" ? null : value, page: null });
  }

  function handlePage(next: number) {
    updateParams({ page: next === 1 ? null : String(next) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function commitPriceMax(value: number) {
    updateParams({ price_max: value >= maxPrice ? null : String(value) });
  }

  function handleInStock(checked: boolean) {
    updateParams({ in_stock: checked ? "1" : null, page: null });
  }

  function handleSearch(value: string) {
    setSearchRaw(value);
    updateParams({ q: value || null, page: null });
  }

  function clearFilters() {
    setSearchRaw("");
    setActiveCollectionId(null);
    updateParams({
      price_max: null,
      in_stock: null,
      sort_by: null,
      page: null,
      q: null,
    });
  }

  const filtered = useMemo(() => {
    let list = [...products];

    if (inStockOnly) list = list.filter(isInStock);
    if (priceMax !== null)
      list = list.filter((p) => (p.price ?? 0) <= priceMax);
    if (activeCollectionId) {
      list = list.filter((p) =>
        (p.collectionProducts ?? []).some(
          (cp) => cp.collection.id === activeCollectionId,
        ),
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q),
      );
    }

    switch (sort) {
      case "price-ascending":
        list.sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
        break;
      case "price-descending":
        list.sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));
        break;
      case "title-ascending":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "title-descending":
        list.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "newest":
        list.sort(
          (a, b) =>
            new Date(b.createdAt ?? 0).getTime() -
            new Date(a.createdAt ?? 0).getTime(),
        );
        break;
    }

    return list;
  }, [products, inStockOnly, priceMax, activeCollectionId, search, sort]);

  const totalPages = pageSize > 0 ? Math.ceil(filtered.length / pageSize) : 1;
  const currentPage = Math.min(page, totalPages || 1);
  const paginated =
    pageSize > 0
      ? filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
      : filtered;

  const hasActiveFilters =
    inStockOnly ||
    priceMax !== null ||
    search.trim() !== "" ||
    activeCollectionId !== null ||
    sort !== "featured";

  return {
    // Sort
    sortParam: sort,
    handleSort,

    // Pagination
    currentPage,
    totalPages,
    handlePage,

    // Price range
    priceMax,
    maxPrice,
    localPriceMax,
    setLocalPriceMax,
    commitPriceMax,

    // Availability
    inStockOnly,
    handleInStock,
    inStockCount,

    // Search
    search,
    setSearch: handleSearch,

    // Collection filter
    activeCollectionId,
    setActiveCollectionId,
    collections,

    // Results
    filtered,
    paginated,

    // Helpers
    hasActiveFilters,
    clearFilters,
  };
}
