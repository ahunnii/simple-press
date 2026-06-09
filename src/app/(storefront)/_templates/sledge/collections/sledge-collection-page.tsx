import { Suspense } from "react";
import Link from "next/link";

import type { DefaultCollectionPageTemplateProps } from "../../types";
import type { Product } from "~/types";
import {
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { SledgeCollectionCard } from "../shared/sledge-collection-card";
import {
  SledgeEmptyState,
  SledgePageHeader,
  SledgePageSection,
} from "../shared/sledge-page-layout";
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
    <PageTransition>
      <SledgePageHeader
        title={collection.name}
        intro={collection.description ?? undefined}
        backLink={{ href: "/collections", label: "All Collections" }}
        meta={
          itemCount > 0 ? (
            <p className="sl-eyebrow mt-3 font-sans text-xs tracking-[0.14em] uppercase">
              {itemCount} {itemCount === 1 ? "piece" : "pieces"}
            </p>
          ) : undefined
        }
      />

      {products.length === 0 ? (
        <SledgeEmptyState
          message="No pieces in this collection yet."
          action={
            <Link href="/shop" className="sl-btn text-xs">
              Browse All Products →
            </Link>
          }
        />
      ) : (
        <Suspense fallback={<div className="px-7 py-24 text-center" />}>
          <SledgeCollectionClient products={products} />
        </Suspense>
      )}

      {others.length > 0 && (
        <SledgePageSection>
          <div className="mb-12 flex items-end justify-between gap-6">
            <h2 className="sl-rail-heading font-heading font-bold uppercase">
              More Collections
            </h2>
            <Link
              href="/collections"
              className="sl-cta-pill hidden shrink-0 items-center gap-2 px-4 py-2.5 font-sans text-[14px] font-medium tracking-[.18em] uppercase transition-opacity hover:opacity-70 md:flex"
            >
              View All →
            </Link>
          </div>

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
        </SledgePageSection>
      )}
    </PageTransition>
  );
}
