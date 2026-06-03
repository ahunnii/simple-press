import type { DefaultProductsPageTemplateProps } from "../../types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";

import { resolveFields } from "..";
import { ModernProductsFilterClient } from "./modern-products-filter-client";

export function ModernProductsPage({
  business,
}: DefaultProductsPageTemplateProps) {
  const products = business?.products ?? [];

  const collectionsMap = new Map<
    string,
    { id: string; name: string; slug: string; count: number }
  >();
  for (const product of products) {
    for (const cp of product.collectionProducts ?? []) {
      const col = cp.collection;
      const entry = collectionsMap.get(col.id);
      if (entry) {
        entry.count++;
      } else {
        collectionsMap.set(col.id, {
          id: col.id,
          name: col.name,
          slug: col.slug,
          count: 1,
        });
      }
    }
  }
  const collections = Array.from(collectionsMap.values());

  const f = resolveFields(business.siteContent?.customFields, [
    "modern.products.tagline",
    "modern.products.title",
    "modern.products.description",
  ]);

  return (
    <div className="bg-background">
      <div
        className="border-border border-b"
        {...sectionGroupAttr("products", "main")}
      >
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
            {f["modern.products.tagline"]}
          </p>
          <h1 className="text-foreground mt-2 font-serif text-4xl md:text-5xl">
            {f["modern.products.title"]}
          </h1>
          <p className="text-muted-foreground mt-4 max-w-lg">
            {f["modern.products.description"]}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <ModernProductsFilterClient
          products={products}
          collections={collections}
        />
      </div>
    </div>
  );
}
