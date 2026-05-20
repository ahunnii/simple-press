import Link from "next/link";

import type { DefaultProductsPageTemplateProps } from "../../types";
import type { Product } from "~/types";
import { FadeIn, PageTransition } from "~/components/page-animations";

import { resolveFields } from "../index";
import { NoiseShopClient } from "./noise-shop-client";

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
  type CollectionEntry = { id: string; name: string; slug: string; count: number };
  const collectionMap = new Map<string, CollectionEntry>();
  for (const p of business.products ?? []) {
    for (const cp of p.collectionProducts ?? []) {
      const col = cp.collection;
      if (!col) continue;
      const existing = collectionMap.get(col.id);
      if (existing) existing.count++;
      else collectionMap.set(col.id, { id: col.id, name: col.name, slug: col.slug, count: 1 });
    }
  }
  const collections = Array.from(collectionMap.values()).slice(0, 6);

  return (
    <PageTransition>
      {/* ── Centered page header (design: "Collection" overline + h1) ── */}
      <section
        className="border-b-2 border-foreground text-center px-6 pt-10 pb-14"
        style={{ background: "var(--vn-paper)" }}
      >
        <FadeIn className="mx-auto" style={{ maxWidth: "1440px" }}>
          <p
            className="font-mono text-[10px] tracking-[0.28em] uppercase mb-4"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            Collection
          </p>
          <h1
            className="font-serif italic leading-none tracking-tight"
            style={{
              fontSize: "clamp(2.8rem, 6vw, 4.5rem)",
              letterSpacing: "-0.025em",
            }}
          >
            {shopHeading}
          </h1>
          {shopIntro && (
            <p
              className="font-sans mt-5 mx-auto"
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

      {/* ── Collection browse strip ── */}
      {collections.length > 0 && (
        <section
          className="border-b border-foreground/20 px-7 py-8"
          style={{ background: "var(--vn-paper)" }}
        >
          <div
            className="mx-auto flex items-center gap-3 flex-wrap"
            style={{ maxWidth: "1440px" }}
          >
            <span
              className="font-mono text-[10px] tracking-[0.22em] uppercase mr-2"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              Browse:
            </span>
            {collections.map((col) => (
              <Link
                key={col.id}
                href={`/collections/${col.slug}`}
                className="vn-stamp text-[10px] transition-all hover:bg-foreground hover:text-background"
              >
                {col.name}
                <span
                  className="font-mono text-[9px]"
                  style={{ color: "var(--vn-steel-mist)" }}
                >
                  &nbsp;{col.count}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Products: sidebar filters + grid (client) ── */}
      <NoiseShopClient products={products} heading={shopHeading} />
    </PageTransition>
  );
}
