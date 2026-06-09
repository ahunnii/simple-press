import { Suspense } from "react";

import type { DefaultProductsPageTemplateProps } from "../../types";
import type { Product } from "~/types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { PageTransition } from "~/components/page-animations";

import { resolveFields } from "../index";
import { SledgePageHeader } from "../shared/sledge-page-layout";
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
    <PageTransition>
      <SledgePageHeader
        title={shopHeading}
        intro={shopIntro || undefined}
        sectionAttrs={sectionGroupAttr("shop", "listing")}
      />

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
