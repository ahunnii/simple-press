"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import type { Product } from "~/types";
import { getEffectivePrice } from "~/lib/prices";

import { DefaultProductCard } from "../shared/default-product-card";

type SortOption =
  | "featured"
  | "title-ascending"
  | "title-descending"
  | "price-ascending"
  | "price-descending"
  | "newest";

const SORT_LABELS: Record<SortOption, string> = {
  featured: "Featured",
  "title-ascending": "A → Z",
  "title-descending": "Z → A",
  "price-ascending": "Price: Low to High",
  "price-descending": "Price: High to Low",
  newest: "Newest",
};

export function DefaultShopFilterClient({
  products,
}: {
  products: Product[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sortParam = (searchParams.get("sort_by") ?? "featured") as SortOption;

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

  function handleSort(value: SortOption) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "featured") {
      params.delete("sort_by");
    } else {
      params.set("sort_by", value);
    }
    const qs = params.toString();
    router.replace(pathname + (qs ? "?" + qs : ""), { scroll: false });
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <select
          aria-label="Sort products"
          value={sortParam}
          onChange={(e) => handleSort(e.target.value as SortOption)}
          className="cursor-pointer border-0 bg-transparent text-sm text-gray-600 focus:outline-none"
        >
          {Object.entries(SORT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {sorted.map((product, index) => (
          <DefaultProductCard key={product.id} product={product} index={index} />
        ))}
      </div>
    </div>
  );
}
