import { Suspense } from "react";

import type { DefaultProductsPageTemplateProps } from "../../types";
import type { Product } from "~/types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { FadeIn, PageTransition } from "~/components/page-animations";

import { resolveFields } from "../index";
import { NoiseShopClient } from "./noise-shop-filter-client";

export function NoiseShopPage({ business }: DefaultProductsPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  const f = resolveFields(customFields, [
    "noise.shop-listing-heading",
    "noise.shop-listing-intro",
  ]);

  const shopHeading = f["noise.shop-listing-heading"] ?? "The Collection";
  const shopIntro = f["noise.shop-listing-intro"] ?? "";
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
      {/* ── Centered page header (design: "Collection" overline + h1) ── */}
      <section
        className="px-6 pt-14 pb-14 text-center"
        style={{
          background: "var(--vn-paper)",
          borderBottom: "1px solid var(--vn-line-soft) ",
        }}
        {...sectionGroupAttr("shop", "listing")}
      >
        <FadeIn className="mx-auto" style={{ maxWidth: "1440px" }}>
          <p
            className="mb-4 font-mono text-[10px] tracking-[0.28em] uppercase"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            Shop
          </p>
          <h1
            className="font-serif leading-none tracking-tight italic"
            style={{
              fontSize: "clamp(2.8rem, 6vw, 4.5rem)",
              letterSpacing: "-0.025em",
            }}
          >
            {shopHeading}
          </h1>
          {shopIntro && (
            <p
              className="mx-auto mt-5 font-sans"
              style={{
                fontSize: "15px",
                lineHeight: 1.85,
                color: "var(--vn-steel-mist)",
                maxWidth: "56ch",
              }}
            >
              {shopIntro}
            </p>
          )}
        </FadeIn>
      </section>

      {/* ── Products: sidebar filters + grid (client) ── */}
      <Suspense>
        <NoiseShopClient
          products={products}
          heading={shopHeading}
          collections={collections}
        />
      </Suspense>
    </PageTransition>
  );
}
