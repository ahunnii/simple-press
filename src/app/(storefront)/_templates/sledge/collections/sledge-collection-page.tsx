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

import { SledgeCollectionCard } from "../shared/sledge-collection-card";
import { SledgeCollectionClient } from "./sledge-collection-client";

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
            className="sl-eyebrow mb-5 inline-block font-sans text-xs tracking-[0.18em] uppercase transition-opacity hover:opacity-60"
          >
            ← All Collections
          </Link>
          <h1 className="sl-page-title-lg font-heading leading-none font-semibold tracking-tight">
            {collection.name}
          </h1>
          {collection.description && (
            <p className="sl-eyebrow mt-5 max-w-2xl font-sans text-sm leading-relaxed md:text-base">
              {collection.description}
            </p>
          )}
          {itemCount > 0 && (
            <p className="sl-eyebrow mt-3 font-sans text-xs tracking-[0.14em] uppercase">
              {itemCount} {itemCount === 1 ? "piece" : "pieces"}
            </p>
          )}
        </FadeIn>
      </section>

      {products.length === 0 ? (
        <FadeIn className="px-7 py-24 text-center">
          <p className="sl-eyebrow font-sans text-base">
            No pieces in this collection yet.
          </p>
          <Link href="/shop" className="sl-btn mt-8 text-xs">
            Browse All Products →
          </Link>
        </FadeIn>
      ) : (
        <Suspense fallback={<div className="px-7 py-24 text-center" />}>
          <SledgeCollectionClient
            products={products}
            backHref="/collections"
            backLabel="All Collections"
          />
        </Suspense>
      )}

      {others.length > 0 && (
        <section className="mx-auto max-w-7xl px-7 py-16 md:py-20">
          <FadeIn className="mb-12 flex items-end justify-between gap-6">
            <h2 className="sl-rail-heading font-heading font-bold uppercase">
              More Collections
            </h2>
            <Link
              href="/collections"
              className="sl-cta-pill hidden shrink-0 items-center gap-2 px-4 py-2.5 font-sans text-[14px] font-medium tracking-[.18em] uppercase transition-opacity hover:opacity-70 md:flex"
            >
              View All →
            </Link>
          </FadeIn>

          <StaggerContainer
            className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6"
            staggerDelay={0.07}
          >
            {others.map((col) => (
              <StaggerItem key={col.id}>
                <SledgeCollectionCard
                  name={col.name}
                  slug={col.slug}
                  imageUrl={col.imageUrl}
                  count={col._count.collectionProducts}
                  compact
                />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>
      )}
    </PageTransition>
  );
}
