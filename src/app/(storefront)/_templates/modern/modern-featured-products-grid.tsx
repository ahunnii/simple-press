"use client";

import type { CardProduct } from "./modern-product-card";
import { api } from "~/trpc/react";

import { ModernProductCard } from "./modern-product-card";

export function FeaturedProductsGrid() {
  const { data: products } = api.product.getFeatured.useQuery();
  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
      {products?.map((product) => (
        <ModernProductCard key={product.id} product={product as CardProduct} />
      ))}
    </div>
  );
}
