import { Suspense } from "react";
import Link from "next/link";

import type { DefaultCollectionPageTemplateProps } from "../../types";
import type { Product } from "~/types";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

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

export function SledgeCollectionPage({
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

  const itemCount = products.length;

  return (
    <PageTransition className="bg-white">
      <section className="mx-auto w-full max-w-7xl px-6 pt-14 pb-10 md:pb-12">
        <FadeIn className="text-left">
          <Link
            href="/collections"
            className="mb-5 inline-block font-sans text-xs tracking-[0.18em] uppercase transition-opacity hover:opacity-60"
            style={{ color: "var(--sl-ink-soft)" }}
          >
            ← All Collections
          </Link>
          <h1
            className="font-heading leading-none font-semibold tracking-tight"
            style={{
              fontSize: "clamp(2.8rem, 6vw, 4.5rem)",
              letterSpacing: "-0.025em",
              color: "var(--sl-orange)",
            }}
          >
            {collection.name}
          </h1>
          {collection.description && (
            <p
              className="mt-5 max-w-2xl font-sans text-sm leading-relaxed md:text-base"
              style={{ color: "var(--sl-ink-soft)" }}
            >
              {collection.description}
            </p>
          )}
          {itemCount > 0 && (
            <p
              className="mt-3 font-sans text-xs tracking-[0.14em] uppercase"
              style={{ color: "var(--sl-ink-soft)" }}
            >
              {itemCount} {itemCount === 1 ? "piece" : "pieces"}
            </p>
          )}
        </FadeIn>
      </section>

      {products.length === 0 ? (
        <FadeIn className="px-7 py-24 text-center">
          <p
            className="font-sans text-base"
            style={{ color: "var(--sl-ink-soft)" }}
          >
            No pieces in this collection yet.
          </p>
          <Link href="/shop" className="sl-btn mt-8 text-xs">
            Browse All Products →
          </Link>
        </FadeIn>
      ) : (
        <Suspense fallback={<div className="px-7 py-24 text-center" />}>
          <NoiseCollectionClient
            products={products}
            backHref="/collections"
            backLabel="All Collections"
          />
        </Suspense>
      )}

      {others.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-7">
          <FadeIn className="mb-10 flex items-center justify-between">
            <h2
              className="font-heading uppercase"
              style={{
                fontSize: "clamp(1.5rem, 4vw, 2.5rem)",
                color: "var(--sl-orange)",
                letterSpacing: "0.04em",
                lineHeight: 1,
              }}
            >
              More Collections
            </h2>
            <Link
              href="/collections"
              className="hidden shrink-0 items-center gap-2 px-4 py-2 font-sans text-xs tracking-[.2em] uppercase transition-opacity hover:opacity-60 md:flex"
              style={{
                border: "1px solid var(--sl-ink)",
                color: "var(--sl-ink)",
              }}
            >
              View All →
            </Link>
          </FadeIn>

          <StaggerContainer
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6"
            staggerDelay={0.05}
          >
            {others.map((col) => {
              const count = col._count.collectionProducts;
              return (
                <StaggerItem key={col.id}>
                  <Link
                    href={`/collections/${col.slug}`}
                    className="group flex flex-col overflow-hidden rounded-sm bg-white transition-shadow hover:shadow-md"
                    style={{ border: "1px solid #e8e8e8" }}
                  >
                    <div
                      className="relative aspect-[4/5] overflow-hidden"
                      style={{ background: "var(--sl-green)" }}
                    >
                      <svg
                        viewBox="0 0 100 140"
                        className="absolute inset-0 h-full w-full"
                        style={{ padding: "10%" }}
                        aria-hidden="true"
                      >
                        <path
                          d={getCategorySilhouette(col.name)}
                          fill="var(--sl-cream)"
                          opacity="0.9"
                        />
                      </svg>
                    </div>
                    <div className="flex flex-col gap-1 px-3 py-3">
                      <span
                        className="font-sans text-sm leading-tight tracking-[0.04em] uppercase transition-opacity group-hover:opacity-70"
                        style={{ color: "var(--sl-ink)" }}
                      >
                        {col.name}
                      </span>
                      <span
                        className="font-sans text-[10px] tracking-[0.12em] uppercase"
                        style={{ color: "var(--sl-ink-soft)" }}
                      >
                        {count} {count === 1 ? "piece" : "pieces"}
                      </span>
                    </div>
                  </Link>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </section>
      )}
    </PageTransition>
  );
}
