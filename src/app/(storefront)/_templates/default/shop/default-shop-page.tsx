import type { DefaultProductsPageTemplateProps } from "../../types";

import { DefaultProductCard } from "../shared/default-product-card";
import { DefaultShopFilterClient } from "./default-shop-filter-client";

export function DefaultProductsPage({
  business,
}: DefaultProductsPageTemplateProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-semibold text-gray-900">
          All Products
        </h1>
        <p className="font-medium text-gray-600">
          {business.products?.length} product
          {business.products?.length !== 1 ? "s" : ""}
        </p>
      </div>

      {business.products?.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-lg text-gray-500">
            No products available at this time.
          </p>
        </div>
      ) : (
        <DefaultShopFilterClient products={business.products} />
      )}
    </div>
  );
}
