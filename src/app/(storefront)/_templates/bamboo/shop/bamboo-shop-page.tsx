import { Suspense } from "react";

import type { DefaultProductsPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { FadeIn, PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import { BambooPageShelf } from "../shared/bamboo-page-shelf";
import { BambooShopClient } from "./bamboo-shop-client";

export async function BambooShopPage({
  business,
}: DefaultProductsPageTemplateProps) {
  const f = resolveFields(business.siteContent?.customFields, [
    "bamboo.products.listing-eyebrow",
    "bamboo.products.listing-title",
    "bamboo.products.listing-intro",
  ]);

  return (
    <PageTransition>
      {/* 2026-09-25: this page used to be one continuous cream section with
          no background-band split between the header and the listing — that
          no longer holds. The eyebrow/h1/lede now sits in the shared
          cream-deep "top shelf" (shared/bamboo-page-shelf.tsx) so the
          header's emblem always hangs into a deliberate band instead of
          floating over plain cream; the listing gets its own flat-cream
          section below. */}
      <BambooPageShelf>
        <FadeIn className="mx-auto max-w-3xl text-center">
          <div {...sectionGroupAttr("products", "listing")}>
            {f["bamboo.products.listing-eyebrow"] ? (
              <p
                className="text-sm font-semibold tracking-widest text-[var(--bam-gold)] uppercase"
                {...fieldAttr("bamboo.products.listing-eyebrow")}
              >
                {f["bamboo.products.listing-eyebrow"]}
              </p>
            ) : null}
            <h1 className="text-foreground font-serif mt-3 text-4xl font-bold tracking-tight md:text-5xl">
              <span
                className="text-balance"
                {...fieldAttr("bamboo.products.listing-title")}
              >
                {f["bamboo.products.listing-title"]}
              </span>
            </h1>
            <p
              className="text-muted-foreground mt-4 text-lg"
              {...fieldAttr("bamboo.products.listing-intro")}
            >
              {f["bamboo.products.listing-intro"]}
            </p>
          </div>
        </FadeIn>
      </BambooPageShelf>

      <section className="bg-background px-4 py-12 md:py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {business.products?.length === 0 ? (
            <div className="py-16 text-center">
              <h2 className="text-muted-foreground text-lg">
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
