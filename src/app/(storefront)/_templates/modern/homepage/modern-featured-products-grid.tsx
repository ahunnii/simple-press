import type { RouterOutputs } from "~/trpc/react";
import type { Product } from "~/types";

import { ModernProductCard } from "../shared/modern-product-card";

// Sourced server-side from `api.business.getHomepage()` by modern-home-page.tsx
// and passed in as a prop — avoids the client-side fetch + loading-spinner
// flash that a `useQuery` here used to cause.
type FeaturedProduct = NonNullable<
  RouterOutputs["business"]["getHomepage"]
>["products"][number];

export function FeaturedProductsGrid({
  products,
}: {
  products: FeaturedProduct[];
}) {
  if (products.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div className="col-span-full text-center">
          <p className="text-muted-foreground">No products found</p>
        </div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((product, index) => (
        <ModernProductCard
          key={product.id}
          product={product as Product}
          index={index}
        />
      ))}
    </div>
  );
}
