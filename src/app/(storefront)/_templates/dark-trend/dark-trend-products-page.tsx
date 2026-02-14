import type { RouterOutputs } from "~/trpc/react";

import { DarkTrendGeneralLayout } from "./dark-trend-general-layout";
import { DarkTrendProductCard } from "./dark-trend-product-card";

type Props = {
  business: NonNullable<RouterOutputs["business"]["getWithProducts"]>;
};

export function DarkTrendProductsPage({ business }: Props) {
  return (
    <DarkTrendGeneralLayout title="All Products">
      {business.products?.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-lg text-gray-500">
            No products available at this time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
          {business.products?.map((product, index) => (
            <DarkTrendProductCard
              key={product.id}
              index={index}
              product={{
                id: product.id,
                name: product.name,
                description: product.description ?? "No description available",
                price:
                  product?.variants?.length > 0
                    ? (product.variants[0]?.price ?? 0)
                    : product.price,
                originalPrice: null,
                image: product.images[0]?.url ?? "",
                badge: null,
                category: "",
                slug: product.slug ?? "",
              }}
            />
          ))}
        </div>
      )}
    </DarkTrendGeneralLayout>
  );
}
