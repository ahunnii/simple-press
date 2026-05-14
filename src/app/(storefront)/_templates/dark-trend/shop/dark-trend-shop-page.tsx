import type { DefaultProductsPageTemplateProps } from "../../types";
import { Separator } from "~/components/ui/separator";

import { DarkTrendGeneralLayout } from "../layout/dark-trend-general-layout";
import { DarkTrendProductCard } from "../shared/dark-trend-product-card";

export function DarkTrendShopPage({
  business,
}: DefaultProductsPageTemplateProps) {
  return (
    <DarkTrendGeneralLayout title="All Products">
      <Separator className="my-10" />
      {business.products?.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-lg text-gray-500">
            No products available at this time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {business.products?.map((product, index) => (
            <DarkTrendProductCard
              key={product.id}
              index={index}
              product={product}
            />
          ))}
        </div>
      )}
    </DarkTrendGeneralLayout>
  );
}
