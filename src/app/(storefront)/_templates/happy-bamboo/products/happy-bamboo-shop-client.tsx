"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
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

import { HappyBambooHorizontalProductCard } from "./happy-bamboo-product-card";

type Product = NonNullable<
  RouterOutputs["business"]["getWithProducts"]
>["products"][number];

type SortOption = "newest" | "price-asc" | "price-desc" | "name-asc";

function getEffectivePrice(product: Product): number {
  return product.variants.length > 0
    ? (product.variants[0]?.price ?? product.price)
    : product.price;
}

function getEffectiveCompareAtPrice(product: Product): number | null {
  if (product.variants.length > 0) {
    return product.variants[0]?.compareAtPrice ?? product.compareAtPrice ?? null;
  }
  return product.compareAtPrice ?? null;
}

interface Props {
  products: Product[];
  saleBadgeFormat: string;
  shopHeading: string;
  shopIntro: string;
}

export function HappyBambooShopClient({
  products,
  saleBadgeFormat,
  shopHeading,
  shopIntro,
}: Props) {
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
      <section className="mx-auto max-w-7xl py-16 md:py-24">
        <FadeIn className="mx-auto max-w-3xl text-center">
          <Badge className="mb-4">Eco-Friendly Products</Badge>
          <h1 className="mb-4 font-serif text-4xl font-bold md:text-5xl">
            {shopHeading}
          </h1>
          {shopIntro && (
            <p className="text-muted-foreground text-lg">{shopIntro}</p>
          )}
        </FadeIn>

        {/* Controls */}
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
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
                className="text-muted-foreground gap-1.5"
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
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
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
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Product grid */}
        <div className="grid grid-cols-1 gap-6 py-12 md:py-20 lg:grid-cols-2">
          {filtered.map((product, index) => (
            <HappyBambooHorizontalProductCard
              key={product.id}
              index={index}
              saleBadgeFormat={saleBadgeFormat}
              product={{
                id: product.id,
                name: product.name,
                description: product.description ?? "No description available",
                price: getEffectivePrice(product),
                compareAtPrice: getEffectiveCompareAtPrice(product),
                hasVariants: product.variants.length > 0,
                image: product.images[0]?.url ?? "/placeholder.svg",
                badge: null,
                category: "",
                slug: product.slug ?? "",
                additionalFields: product.additionalFields,
                trackInventory: product.trackInventory,
                inventoryQty: product.inventoryQty,
                allowBackorders: product.allowBackorders,
              }}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-muted-foreground py-12 text-center text-sm">
            No products match your search.{" "}
            <button
              onClick={clearFilters}
              className="text-primary underline-offset-2 hover:underline"
            >
              Clear filters
            </button>
          </p>
        )}
      </section>
    </PageTransition>
  );
}
