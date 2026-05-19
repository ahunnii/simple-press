import Link from "next/link";

import type { DefaultProductsPageTemplateProps } from "../../types";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { resolveFields } from "../index";
import { NoiseProductCard } from "../shared/noise-product-card";

/* SVG silhouette paths per category type */
const SILHOUETTES: Record<string, string> = {
  wrap: "M30 10 Q50 0 70 10 Q80 30 75 50 Q90 70 80 100 Q70 130 50 130 Q30 130 20 100 Q10 70 25 50 Q20 30 30 10 Z",
  dress: "M40 8 L60 8 L62 25 L75 50 L82 130 L18 130 L25 50 L38 25 Z",
  coat: "M35 8 L65 8 L80 28 L88 60 L84 130 L62 130 L60 75 L50 130 L40 75 L38 130 L16 130 L12 60 L20 28 Z",
  scarf: "M15 25 Q35 18 50 30 Q65 42 85 28 L88 35 Q70 55 50 45 Q30 35 18 50 Z M50 40 L42 130 L58 130 Z",
  default: "M35 8 L65 8 L80 28 L88 130 L12 130 L20 28 Z",
};

function getCategorySilhouette(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("wrap")) return SILHOUETTES.wrap!;
  if (lower.includes("dress") || lower.includes("skirt")) return SILHOUETTES.dress!;
  if (lower.includes("coat") || lower.includes("jacket")) return SILHOUETTES.coat!;
  if (lower.includes("scarf")) return SILHOUETTES.scarf!;
  return SILHOUETTES.default!;
}

export function NoiseShopPage({ business }: DefaultProductsPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  const f = resolveFields(customFields, [
    "noise.shop-listing-heading",
    "noise.shop-listing-intro",
  ]);

  const shopHeading = f["noise.shop-listing-heading"] ?? "The Index.";
  const shopIntro = f["noise.shop-listing-intro"] ?? "";
  const products = business.products ?? [];
  const productCount = products.length;

  /* Derive unique collections from products */
  type CollectionEntry = { id: string; name: string; slug: string; count: number };
  const collectionMap = new Map<string, CollectionEntry>();
  for (const p of products) {
    for (const cp of p.collectionProducts ?? []) {
      const col = cp.collection;
      if (!col) continue;
      const existing = collectionMap.get(col.id);
      if (existing) {
        existing.count++;
      } else {
        collectionMap.set(col.id, { id: col.id, name: col.name, slug: col.slug, count: 1 });
      }
    }
  }
  const collections = Array.from(collectionMap.values()).slice(0, 6);

  return (
    <PageTransition>
      {/* Editorial page header */}
      <section
        className="border-b-2 border-foreground"
        style={{ background: "var(--vn-paper)" }}
      >
        <div className="flex items-stretch" style={{ minHeight: "140px" }}>
          {/* Left meta */}
          <div
            className="hidden md:flex flex-col justify-center gap-2 px-7 py-8 border-r border-foreground/20"
            style={{ minWidth: "200px" }}
          >
            <span className="font-mono text-[9.5px] tracking-[0.22em] uppercase text-muted-foreground">
              Section / 02
            </span>
            <span className="font-mono text-[9.5px] tracking-[0.18em] uppercase text-muted-foreground">
              The Index, S/S 26
            </span>
            <span className="font-mono text-[9.5px] tracking-[0.18em] uppercase text-muted-foreground opacity-60">
              ↳ {productCount} pieces
            </span>
          </div>

          {/* Title */}
          <FadeIn className="flex-1 flex items-center px-7 py-8">
            <h1
              className="font-serif italic leading-none tracking-tight"
              style={{
                fontSize: "clamp(3rem, 7vw, 6rem)",
                letterSpacing: "-0.025em",
              }}
            >
              {shopHeading}
            </h1>
          </FadeIn>

          {/* Right meta */}
          <div
            className="hidden lg:flex flex-col justify-center gap-2 px-7 py-8 border-l border-foreground/20 text-right"
            style={{ minWidth: "160px" }}
          >
            <span className="font-mono text-[9.5px] tracking-[0.18em] uppercase text-muted-foreground">
              Visual Noise
            </span>
            <span className="font-mono text-[9.5px] tracking-[0.18em] uppercase text-muted-foreground">
              {productCount} garments
            </span>
          </div>
        </div>

        {shopIntro && (
          <div className="border-t border-foreground/15 px-7 py-4">
            <p className="font-sans text-sm text-muted-foreground max-w-2xl">
              {shopIntro}
            </p>
          </div>
        )}
      </section>

      {/* Category browse cards — only shown when collections exist */}
      {collections.length > 0 && (
        <section
          className="border-b-2 border-foreground px-7 pb-10 pt-14"
          style={{ background: "var(--vn-paper)" }}
        >
          <div className="mx-auto max-w-7xl">
            <div className="flex items-end justify-between mb-10 gap-6">
              <div>
                <p
                  className="font-mono text-[9.5px] tracking-[0.18em] uppercase mb-2.5"
                  style={{ color: "var(--vn-steel)" }}
                >
                  Browse by category
                </p>
                <h2
                  className="font-serif italic leading-[1.05] tracking-tight"
                  style={{
                    fontSize: "clamp(2rem, 4.4vw, 3.75rem)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Choose your{" "}
                  <em style={{ color: "var(--vn-steel)" }}>frequency.</em>
                </h2>
              </div>
              <Link
                href="#all"
                className="font-mono text-[10.5px] tracking-[0.22em] uppercase px-5 py-3.5 whitespace-nowrap transition-all hover:opacity-80 flex-shrink-0"
                style={{
                  border: "1px solid var(--vn-ink)",
                  color: "var(--vn-ink)",
                }}
              >
                View everything ↓
              </Link>
            </div>

            <div
              className={[
                "grid gap-3.5",
                collections.length <= 2 ? "grid-cols-2" : "",
                collections.length === 3 ? "grid-cols-2 sm:grid-cols-3" : "",
                collections.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "",
                collections.length === 5 ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" : "",
                collections.length >= 6 ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" : "",
              ].join(" ")}
            >
              {collections.map((col, i) => (
                <Link
                  key={col.id}
                  href={`/collections/${col.slug}`}
                  className="vn-cat-card flex flex-col border border-foreground overflow-hidden"
                  style={{ background: "var(--vn-paper)" }}
                >
                  {/* Silhouette panel */}
                  <div
                    className="aspect-[4/5] relative border-b border-foreground overflow-hidden"
                    style={{
                      background: `linear-gradient(180deg, var(--vn-steel-deep), var(--vn-steel))`,
                    }}
                  >
                    <svg
                      viewBox="0 0 100 140"
                      className="absolute inset-0 w-full h-full"
                      style={{ padding: "10%" }}
                      aria-hidden="true"
                    >
                      <path
                        d={getCategorySilhouette(col.name)}
                        fill="var(--vn-bone)"
                        opacity="0.9"
                      />
                    </svg>
                  </div>

                  {/* Meta — hover styles handled by .vn-cat-card CSS */}
                  <div className="vn-cat-meta flex flex-col gap-1 px-3.5 py-3.5">
                    <span
                      className="vn-cat-num font-mono text-[10px] tracking-[0.22em] uppercase"
                      style={{ color: "var(--vn-steel)" }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className="vn-cat-name font-serif italic leading-[1.15]"
                      style={{
                        fontSize: "clamp(1.1rem, 1.6vw, 1.6rem)",
                        letterSpacing: "-0.01em",
                        color: "var(--vn-ink)",
                      }}
                    >
                      {col.name}
                    </span>
                    <span
                      className="vn-cat-count font-mono text-[10px] tracking-[0.18em] uppercase"
                      style={{ color: "var(--vn-ink-soft)" }}
                    >
                      {col.count} {col.count === 1 ? "piece" : "pieces"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All garments anchor row */}
      <div
        id="all"
        className="border-b border-foreground/20 flex justify-between items-baseline px-7 py-6"
        style={{ background: "var(--vn-paper)" }}
      >
        <div
          className="font-serif italic leading-none"
          style={{
            fontSize: "clamp(1.6rem, 3vw, 2.8rem)",
            letterSpacing: "-0.02em",
          }}
        >
          All {productCount > 0 ? productCount : ""} garments.
        </div>
        <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
          Detroit-made ↓
        </div>
      </div>

      {/* Product grid */}
      <section className="px-7 py-14" style={{ background: "var(--vn-paper)" }}>
        <StaggerContainer
          className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3"
          staggerDelay={0.07}
        >
          {products.map((product, index) => (
            <StaggerItem key={product.id}>
              <NoiseProductCard index={index} product={product} />
            </StaggerItem>
          ))}
        </StaggerContainer>

        {products.length === 0 && (
          <FadeIn className="py-24 text-center">
            <p className="font-serif italic text-2xl font-light text-muted-foreground">
              The collection is coming soon.
            </p>
          </FadeIn>
        )}
      </section>
    </PageTransition>
  );
}
