import Link from "next/link";

import type { DefaultCollectionPageTemplateProps } from "../../types";
import type { Product } from "~/types";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { NoiseProductCard } from "../shared/noise-product-card";
import { NoiseCollectionClient } from "./noise-collection-client";

const SILHOUETTES: Record<string, string> = {
  wrap: "M30 10 Q50 0 70 10 Q80 30 75 50 Q90 70 80 100 Q70 130 50 130 Q30 130 20 100 Q10 70 25 50 Q20 30 30 10 Z",
  dress: "M40 8 L60 8 L62 25 L75 50 L82 130 L18 130 L25 50 L38 25 Z",
  coat: "M35 8 L65 8 L80 28 L88 60 L84 130 L62 130 L60 75 L50 130 L40 75 L38 130 L16 130 L12 60 L20 28 Z",
  scarf:
    "M15 25 Q35 18 50 30 Q65 42 85 28 L88 35 Q70 55 50 45 Q30 35 18 50 Z M50 40 L42 130 L58 130 Z",
  default: "M35 8 L65 8 L80 28 L88 130 L12 130 L20 28 Z",
};

function getCategorySilhouette(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("wrap")) return SILHOUETTES.wrap!;
  if (lower.includes("dress") || lower.includes("skirt"))
    return SILHOUETTES.dress!;
  if (lower.includes("coat") || lower.includes("jacket"))
    return SILHOUETTES.coat!;
  if (lower.includes("scarf")) return SILHOUETTES.scarf!;
  return SILHOUETTES.default!;
}

export function NoiseCollectionPage({
  collection,
  additionalCollections,
}: DefaultCollectionPageTemplateProps) {
  const products = collection.collectionProducts
    .map((cp) => cp.product)
    .filter(
      (p): p is NonNullable<typeof p> => p != null,
    ) as unknown as Product[];

  const others = (additionalCollections ?? [])
    .filter((c) => c.slug !== collection.slug)
    .slice(0, 6);

  return (
    <PageTransition>
      {/* ── Centered header — "Collection" overline + h1 + description ── */}
      <section
        className="px-6 pt-12 pb-14 text-center"
        style={{
          background: "var(--vn-paper)",
          borderBottom: "1px solid var(--vn-line-soft) ",
        }}
      >
        <FadeIn className="mx-auto" style={{ maxWidth: "1440px" }}>
          <p
            className="mb-4 font-mono text-[10px] tracking-[0.28em] uppercase"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            Collection
          </p>
          <h1
            className="font-serif leading-none tracking-tight italic"
            style={{
              fontSize: "clamp(2.8rem, 6vw, 4.5rem)",
              letterSpacing: "-0.025em",
            }}
          >
            {collection.name}
          </h1>
          {collection.description && (
            <p
              className="mx-auto mt-6 font-sans leading-[1.85]"
              style={{
                fontSize: "15px",
                color: "var(--vn-ink-soft)",
                maxWidth: "56ch",
              }}
            >
              {collection.description}
            </p>
          )}
        </FadeIn>
      </section>

      {/* ── Products: sidebar filters + sort + grid (client) ── */}
      {products.length === 0 ? (
        <FadeIn
          className="px-7 py-24 text-center"
          style={{ background: "var(--vn-paper)" }}
        >
          <p
            className="font-serif text-2xl font-light italic"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            No garments in this collection yet.
          </p>
          <Link
            href="/shop"
            className="vn-stamp vn-stamp-solid mt-8 inline-flex text-[10px]"
          >
            Browse All Garments →
          </Link>
        </FadeIn>
      ) : (
        <NoiseCollectionClient
          products={products}
          backHref="/collections"
          backLabel="All Collections"
        />
      )}

      {/* ── More collections ── */}
      {others.length > 0 && (
        <section
          className="border-foreground border-t-2 px-7 pt-14 pb-14"
          style={{ background: "var(--vn-paper)" }}
        >
          <div className="mx-auto max-w-7xl">
            <FadeIn className="mb-10 flex items-end justify-between gap-6">
              <div>
                <p
                  className="mb-3 font-mono text-[9.5px] tracking-[0.22em] uppercase"
                  style={{ color: "var(--vn-steel-mist)" }}
                >
                  Continue exploring
                </p>
                <h2
                  className="font-serif leading-none tracking-tight italic"
                  style={{
                    fontSize: "clamp(2rem, 4vw, 3rem)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  More collections.
                </h2>
              </div>
              <Link
                href="/collections"
                className="hidden items-center gap-3 font-mono text-[10px] tracking-[0.22em] uppercase transition-opacity hover:opacity-60 md:flex"
                style={{ color: "var(--vn-ink)" }}
              >
                All collections →
              </Link>
            </FadeIn>

            <StaggerContainer
              className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6"
              staggerDelay={0.05}
            >
              {others.map((col, i) => {
                const count = col._count.collectionProducts;
                return (
                  <StaggerItem key={col.id}>
                    <Link
                      href={`/collections/${col.slug}`}
                      className="vn-cat-card border-foreground flex flex-col overflow-hidden border"
                      style={{ background: "var(--vn-paper)" }}
                    >
                      <div
                        className="border-foreground relative aspect-[4/5] overflow-hidden border-b"
                        style={{
                          background: `linear-gradient(180deg, var(--vn-steel-deep), var(--vn-steel))`,
                        }}
                      >
                        <svg
                          viewBox="0 0 100 140"
                          className="absolute inset-0 h-full w-full"
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
                      <div className="vn-cat-meta flex flex-col gap-1 px-3.5 py-3.5">
                        <span
                          className="vn-cat-num font-mono text-[10px] tracking-[0.22em] uppercase"
                          style={{ color: "var(--vn-steel)" }}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span
                          className="vn-cat-name font-serif leading-[1.15] italic"
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
                          {count} {count === 1 ? "piece" : "pieces"}
                        </span>
                      </div>
                    </Link>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          </div>
        </section>
      )}
    </PageTransition>
  );
}
