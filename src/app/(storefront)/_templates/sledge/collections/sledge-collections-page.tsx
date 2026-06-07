import Link from "next/link";

import type { DefaultCollectionsPageTemplateProps } from "../../types";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { SledgeCollectionCard } from "../shared/sledge-collection-card";

export function SledgeCollectionsPage({
  collections,
}: DefaultCollectionsPageTemplateProps) {
  const list = collections ?? [];

  return (
    <PageTransition>
      <section className="mx-auto max-w-7xl px-7 pt-16 pb-10 md:pt-20 md:pb-12">
        <FadeIn className="flex flex-col items-center gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="text-left">
            <h1 className="sl-page-title-lg font-heading font-semibold uppercase">
              All Collections
            </h1>
            <p className="sl-eyebrow mt-5 max-w-7xl font-sans text-sm leading-relaxed md:text-base">
              Browse curated groupings of one-of-a-kind pieces from the studio.
            </p>
          </div>
          <Link
            href="/shop"
            className="sl-cta-pill flex shrink-0 items-center gap-2 self-start px-4 py-2.5 font-sans text-[14px] font-medium tracking-[.18em] uppercase transition-opacity hover:opacity-70 sm:self-auto"
          >
            View All Products →
          </Link>
        </FadeIn>
      </section>

      {list.length === 0 ? (
        <FadeIn className="px-7 py-24 text-center">
          <p className="sl-eyebrow font-sans text-base">
            No collections available at this time.
          </p>
        </FadeIn>
      ) : (
        <section className="mx-auto max-w-7xl px-7 pb-16 md:pb-20">
          <StaggerContainer
            className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4"
            staggerDelay={0.07}
          >
            {list.map((collection) => (
              <StaggerItem key={collection.id}>
                <SledgeCollectionCard
                  name={collection.name}
                  slug={collection.slug}
                  description={collection.description}
                  imageUrl={collection.imageUrl}
                  count={collection._count.collectionProducts}
                />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>
      )}
    </PageTransition>
  );
}
