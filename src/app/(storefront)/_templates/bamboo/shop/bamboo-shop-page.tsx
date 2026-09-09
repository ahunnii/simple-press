import type { Metadata } from "next";
import { Suspense } from "react";

import type { DefaultProductsPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
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
      {/* happy-bamboo's shop composition: one continuous section — centered
          kicker/h1/lede header, then controls + grid directly below, no
          background-band split between header and listing. */}
      <section className="bg-background px-4 py-16 md:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <FadeIn className="mx-auto max-w-3xl text-center">
            <div {...sectionGroupAttr("products", "listing")}>
              <p className="font-sans text-sm font-semibold tracking-widest text-[var(--bam-gold)] uppercase">
                Shop
              </p>
              <h1 className="text-foreground font-serif mt-3 text-4xl font-bold tracking-tight md:text-5xl">
                <span
                  className="text-balance"
                  {...fieldAttr("bamboo.products.listing-title")}
                >
                  {f["bamboo.products.listing-title"]}
                </span>
              </h1>
              <p
                className="text-muted-foreground mt-4 font-sans text-lg"
                {...fieldAttr("bamboo.products.listing-intro")}
              >
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
        </div>
      </section>
    </PageTransition>
  );
}
