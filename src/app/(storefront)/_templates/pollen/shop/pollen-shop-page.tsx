import { Suspense } from "react";

import type { DefaultProductsPageTemplateProps } from "../../types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { FadeIn, PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import { PollenShopFilterClient } from "./pollen-shop-filter-client";

export function PollenShopPage({ business }: DefaultProductsPageTemplateProps) {
  const f = resolveFields(business.siteContent?.customFields, [
    "pollen.shop.listing-title",
    "pollen.shop.listing-intro",
  ]);

  return (
    <PageTransition>
      <section
        className="mx-auto max-w-7xl px-4 pt-40 pb-8 sm:px-6 lg:px-8"
        {...sectionGroupAttr("products", "shop")}
      >
        <FadeIn direction="up">
          <div className="mb-12">
            <p className="mb-2 text-sm font-medium tracking-wider text-[#5e7747] uppercase">
              Our Products
            </p>
            <h1 className="text-4xl font-bold text-[#2a351f] md:text-5xl">
              {f["pollen.shop.listing-title"] ?? "Our Products"}
            </h1>
            {f["pollen.shop.listing-intro"] && (
              <p className="mt-3 max-w-2xl text-[#4c566a]">
                {f["pollen.shop.listing-intro"]}
              </p>
            )}
          </div>
        </FadeIn>

        {business.products?.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-lg text-gray-500">
              No products available at this time.
            </p>
          </div>
        ) : (
          <Suspense>
            <PollenShopFilterClient
              products={business.products ?? []}
              shopHeading={f["pollen.shop.listing-title"] ?? "Our Products"}
              shopIntro={f["pollen.shop.listing-intro"] ?? ""}
            />
          </Suspense>
        )}
      </section>
    </PageTransition>
  );
}
