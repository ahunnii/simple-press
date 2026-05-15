"use client";

import { useMemo } from "react";
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

export function useShopSort(products: Product[], pageSize = 12) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sortParam = (searchParams.get("sort_by") ?? "featured") as SortOption;
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));

  const sorted = useMemo(() => {
    if (sortParam === "featured") return products;
    return [...products].sort((a, b) => {
      switch (sortParam) {
        case "title-ascending":
          return a.name.localeCompare(b.name);
        case "title-descending":
          return b.name.localeCompare(a.name);
        case "price-ascending":
          return getEffectivePrice(a) - getEffectivePrice(b);
        case "price-descending":
          return getEffectivePrice(b) - getEffectivePrice(a);
        case "newest":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        default:
          return 0;
      }
    });
  }, [products, sortParam]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const currentPage = Math.min(page, totalPages || 1);
  const paginated = sorted.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

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
    updateParams({
      sort_by: value === "featured" ? null : value,
      page: null,
    });
  }

  function handlePage(next: number) {
    updateParams({ page: next === 1 ? null : String(next) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return {
    sortParam,
    paginated,
    currentPage,
    totalPages,
    handleSort,
    handlePage,
  };
}
