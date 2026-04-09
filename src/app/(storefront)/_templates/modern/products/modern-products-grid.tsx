"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import type { CardProduct } from "./modern-product-card";
import { cn } from "~/lib/utils";

import { ModernProductCard } from "./modern-product-card";

export function ModernProductsGrid({
  products,
}: {
  products: CardProduct[];
  //   categories: string[];
}) {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") ?? "All";
  const [activeCategory, setActiveCategory] = useState(initialCategory);

  const filtered = products;
  //   activeCategory === "All";
  //   ? products
  //   : products.filter((p) => p.category === activeCategory);

  return (
    <div>
      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveCategory("All")}
          className={cn(
            "px-4 py-2 text-xs font-medium tracking-widest uppercase transition-colors",
            activeCategory === "All"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-primary/10",
          )}
        >
          All
        </button>
        {/* {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={cn(
              "px-4 py-2 text-xs font-medium tracking-widest uppercase transition-colors",
              activeCategory === category
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-primary/10",
            )}
          >
            {category}
          </button>
        ))} */}
      </div>

      {/* Product Count */}
      <p className="text-muted-foreground mt-6 text-sm">
        {filtered.length} {filtered.length === 1 ? "product" : "products"}
      </p>

      {/* Grid */}
      <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((product) => (
          <ModernProductCard key={product.id} product={product} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-muted-foreground">
            No products found in this category.
          </p>
        </div>
      )}
    </div>
  );
}
