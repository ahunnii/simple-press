import { Suspense } from "react";
import type { Metadata } from "next";

import type { DefaultProductsPageTemplateProps } from "../../types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { FadeIn, PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import { BambooShopClient } from "./bamboo-shop-client";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Browse our collection of premium bamboo toilet paper and household paper products. Septic-safe, hypoallergenic, and sustainably crafted.",
};

export async function BambooShopPage({
  business,
}: DefaultProductsPageTemplateProps) {
  const f = resolveFields(business.siteContent?.customFields, [
    "bamboo.products.listing-title",
    "bamboo.products.listing-intro",
  ]);

  return (
    <PageTransition>
      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <FadeIn direction="up">
          <div {...sectionGroupAttr("products", "listing")} className="mb-12">
            <h1 className="text-foreground font-heading text-3xl font-bold tracking-tight md:text-4xl">
              <span className="text-balance">
                {f["bamboo.products.listing-title"]}
              </span>
            </h1>
            <p className="text-muted-foreground mt-3 max-w-2xl font-sans">
              {f["bamboo.products.listing-intro"]}
            </p>
          </div>
        </FadeIn>
        {business.products?.length === 0 ? (
          <div className="py-16 text-center">
            <h2 className="text-muted-foreground font-sans text-lg">
              No products available at this time.
            </h2>
          </div>
        ) : (
          <Suspense>
            <BambooShopClient products={business.products ?? []} />
          </Suspense>
        )}
      </section>
    </PageTransition>
  );
}
