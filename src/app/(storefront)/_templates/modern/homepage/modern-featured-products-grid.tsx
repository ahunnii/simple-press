"use client";

import type { Product } from "~/types";
import { api } from "~/trpc/react";

import { ModernProductCard } from "../shared/modern-product-card";

export function FeaturedProductsGrid() {
  const { data: products } = api.product.getFeatured.useQuery();
  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
      {products?.map((product, index) => (
        <ModernProductCard
          key={product.id}
          product={product as Product}
          index={index}
        />
      ))}
      {products?.length === 0 && (
        <div className="col-span-full text-center">
          <p className="text-muted-foreground">No products found</p>
        </div>
      )}
    </div>
  );
}
