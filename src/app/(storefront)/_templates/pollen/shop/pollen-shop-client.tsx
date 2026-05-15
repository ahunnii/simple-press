"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { FadeIn, PageTransition } from "~/components/page-animations";

import { PollenProductCard } from "../shared/pollen-product-card";

type Product = NonNullable<
  RouterOutputs["business"]["getWithProducts"]
>["products"][number];

type SortOption = "newest" | "price-asc" | "price-desc" | "name-asc";

function getEffectivePrice(product: Product): number {
  return product.variants.length > 0
    ? (product.variants[0]?.price ?? product.price)
    : product.price;
}

interface Props {
  products: Product[];
  shopHeading: string;
  shopIntro: string;
}

export function PollenShopClient({ products, shopHeading, shopIntro }: Props) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(
    null,
  );

  const collections = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; slug: string }>();
    for (const product of products) {
      for (const cp of product.collectionProducts) {
        if (!seen.has(cp.collection.id)) {
          seen.set(cp.collection.id, cp.collection);
        }
      }
    }
    return Array.from(seen.values());
  }, [products]);

  const filtered = useMemo(() => {
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

    if (sort !== "newest") {
      result = [...result].sort((a, b) => {
        if (sort === "price-asc")
          return getEffectivePrice(a) - getEffectivePrice(b);
        if (sort === "price-desc")
          return getEffectivePrice(b) - getEffectivePrice(a);
        if (sort === "name-asc") return a.name.localeCompare(b.name);
        return 0;
      });
    }

    return result;
  }, [products, search, sort, activeCollectionId]);

  const hasActiveFilters =
    search.trim() !== "" || activeCollectionId !== null || sort !== "newest";

  function clearFilters() {
    setSearch("");
    setSort("newest");
    setActiveCollectionId(null);
  }

  return (
    <PageTransition>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <FadeIn direction="up">
          <div className="mb-12">
            <p className="mb-2 text-sm font-medium tracking-wider text-[#5e7747] uppercase">
              Our Products
            </p>
            <h1 className="text-4xl font-bold text-[#2a351f] md:text-5xl">
              {shopHeading}
            </h1>
            {shopIntro && (
              <p className="mt-3 max-w-2xl text-[#4c566a]">{shopIntro}</p>
            )}
          </div>
        </FadeIn>

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
              value={sort}
              onValueChange={(v) => setSort(v as SortOption)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="name-asc">Name: A–Z</SelectItem>
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

        {/* Collection filter pills */}
        {collections.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCollectionId(null)}
              className={cn(
                "rounded-full border px-3.5 py-1 text-sm font-medium transition-colors",
                activeCollectionId === null
                  ? "border-[#215935] bg-[#215935] text-white"
                  : "border-[#2a351f]/20 text-[#4c566a] hover:border-[#215935]/50 hover:text-[#215935]",
              )}
            >
              All
            </button>
            {collections.map((c) => (
              <button
                key={c.id}
                onClick={() =>
                  setActiveCollectionId(
                    c.id === activeCollectionId ? null : c.id,
                  )
                }
                className={cn(
                  "rounded-full border px-3.5 py-1 text-sm font-medium transition-colors",
                  activeCollectionId === c.id
                    ? "border-[#215935] bg-[#215935] text-white"
                    : "border-[#2a351f]/20 text-[#4c566a] hover:border-[#215935]/50 hover:text-[#215935]",
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Product grid */}
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product, index) => (
            <PollenProductCard
              key={product.id}
              index={index}
              product={product}
            />
          ))}
        </div>

        {filtered.length === 0 && (
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
      </section>
    </PageTransition>
  );
}
