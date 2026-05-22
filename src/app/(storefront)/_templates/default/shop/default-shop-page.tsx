import type { DefaultProductsPageTemplateProps } from "../../types";

import { DefaultShopFilterClient } from "./default-shop-filter-client";

export function DefaultProductsPage({
  business,
}: DefaultProductsPageTemplateProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-8">
        <p className="font-base tracking-wider text-gray-600">SHOP</p>
        <h1 className="mb-2 text-4xl font-semibold text-gray-900">
          All Products
        </h1>
        {/* 
        <h1
          className="text-left text-xl leading-none tracking-tight"
          style={{
            fontSize: "clamp(2.1rem, 5.25vw, 3.75rem)",
            letterSpacing: "-0.025em",
          }}
        >
          All Products
        </h1> */}
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
