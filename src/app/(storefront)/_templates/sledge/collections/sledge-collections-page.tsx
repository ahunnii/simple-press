import Link from "next/link";

import type { DefaultCollectionsPageTemplateProps } from "../../types";
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

export function SledgeCollectionsPage({
  collections,
}: DefaultCollectionsPageTemplateProps) {
  const list = collections ?? [];

  return (
    <PageTransition>
      <SledgePageHeader
        title="All Collections"
        intro="Browse curated groupings of one-of-a-kind pieces from the studio."
        actions={
          <Link
            href="/shop"
            className="sl-cta-pill flex items-center gap-2 px-4 py-2.5 font-sans text-[14px] font-medium tracking-[.18em] uppercase transition-opacity hover:opacity-70"
          >
            View All Products →
          </Link>
        }
      />

      {list.length === 0 ? (
        <SledgeEmptyState message="No collections available at this time." />
      ) : (
        <SledgePageSection>
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
        </SledgePageSection>
      )}
    </PageTransition>
  );
}
