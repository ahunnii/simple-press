import { Suspense } from "react";

import type { DefaultProductsPageTemplateProps } from "../../types";
import type { Product } from "~/types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { FadeIn, PageTransition } from "~/components/page-animations";

import { resolveFields } from "../index";
import { SledgeShopFilterClient } from "./sledge-shop-filter-client";

export function SledgeShopPage({ business }: DefaultProductsPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  const f = resolveFields(customFields, [
    "sledge.shop-listing-heading",
    "sledge.shop-listing-intro",
  ]);

  const shopHeading = f["sledge.shop-listing-heading"] ?? "The Collection";
  const shopIntro = f["sledge.shop-listing-intro"] ?? "";
  const products = (business.products ?? []) as unknown as Product[];

  /* Derive unique collections from products for the browse strip */
  type CollectionEntry = {
    id: string;
    name: string;
    slug: string;
    count: number;
  };
  const collectionMap = new Map<string, CollectionEntry>();
  for (const p of business.products ?? []) {
    for (const cp of p.collectionProducts ?? []) {
      const col = cp.collection;
      if (!col) continue;
      const existing = collectionMap.get(col.id);
      if (existing) existing.count++;
      else
        collectionMap.set(col.id, {
          id: col.id,
          name: col.name,
          slug: col.slug,
          count: 1,
        });
    }
  }
  const collections = Array.from(collectionMap.values()).slice(0, 6);

  return (
    <PageTransition className="bg-white">
      {/* ── Centered page header (design: "Collection" overline + h1) ── */}
      <section
        className="mx-auto max-w-7xl px-7 pt-16 pb-10 md:pt-20 md:pb-12"
        {...sectionGroupAttr("shop", "listing")}
      >
        <FadeIn className="text-left">
          <h1 className="sl-page-title-lg font-heading font-semibold uppercase">
            {shopHeading}
          </h1>
          {shopIntro && (
            <p className="sl-eyebrow mx-auto mt-5 max-w-[56ch] font-sans text-[15px] leading-[1.85]">
              {shopIntro}
            </p>
          )}
        </FadeIn>
      </section>

      {/* ── Products: sidebar filters + grid (client) ── */}
      <Suspense>
        <SledgeShopFilterClient
          products={products}
          heading={shopHeading}
          collections={collections}
        />
      </Suspense>
    </PageTransition>
  );
}
