import type { DefaultProductsPageTemplateProps } from "../../types";

import { DefaultShopFilterClient } from "./default-shop-filter-client";

export function DefaultProductsPage({
  business,
}: DefaultProductsPageTemplateProps) {
  return (
    <div>
      {/* Page hero */}
      <section className="border-b border-[#e8e8e8] px-6 pt-20 pb-12 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          <span className="text-xs font-medium tracking-[0.14em] text-[#6b6b6b] uppercase">
            Catalog
          </span>
          <h1 className="mt-3 font-serif text-[clamp(40px,5vw,72px)] leading-[1.04] font-semibold tracking-[-0.03em]">
            All products
          </h1>
        </div>
      </section>

      {/* Shop content */}
      <section className="px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          {business.products?.length === 0 ? (
            <div className="py-24 text-center">
              <p className="text-[#6b6b6b]">
                No products available at this time.
              </p>
            </div>
          ) : (
            <DefaultShopFilterClient products={business.products} />
          )}
        </div>
      </section>
    </div>
  );
}
