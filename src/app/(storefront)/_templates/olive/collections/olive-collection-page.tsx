import type { CSSProperties } from "react";
import Image from "next/image";

import type { DefaultCollectionPageTemplateProps } from "../../types";
import type { OliveCardProduct } from "../shared";

import {
  hasOliveImage,
  OliveBreadcrumb,
  OliveCategoryCard,
  OliveProductGrid,
  OliveReveal,
  OliveRevealGroup,
  OliveSection,
  OliveSectionHeading,
} from "../shared";
import { oliveChipToken } from "../shared/olive-color";

const HEADING_ID = "olive-collection-heading";

/**
 * OliveCollectionPage — one page from the swatch book, opened flat.
 *
 * No template fields: the whole page is driven by the collection record
 * itself (design.md, "CollectionPage — no fields"). The route already 404s
 * for an unpublished collection before this ever renders.
 */
export function OliveCollectionPage({
  collection,
  additionalCollections,
}: DefaultCollectionPageTemplateProps) {
  const products: OliveCardProduct[] = collection.collectionProducts
    .map((cp) => cp.product)
    .filter((p): p is NonNullable<typeof p> => p != null);

  const others = additionalCollections
    .filter((c) => c.slug !== collection.slug)
    .slice(0, 3);

  return (
    <div>
      <OliveSection aria-labelledby={HEADING_ID}>
        <OliveReveal className="flex flex-col gap-6">
          <OliveBreadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Collections", href: "/collections" },
              { label: collection.name },
            ]}
          />

          <OliveSectionHeading
            as="h1"
            id={HEADING_ID}
            heading={collection.name}
            body={collection.description ?? undefined}
          />

          {hasOliveImage(collection.imageUrl) ? (
            <div
              className="olive-card relative w-full overflow-hidden"
              style={{ aspectRatio: "21 / 9" }}
            >
              <Image
                src={collection.imageUrl ?? "/placeholder.svg"}
                alt=""
                fill
                priority
                sizes="(max-width: 1280px) 100vw, 1280px"
                className="object-cover"
              />
            </div>
          ) : null}
        </OliveReveal>
      </OliveSection>

      <OliveSection
        aria-label={`${collection.name} products`}
        style={{ paddingTop: 0 }}
      >
        <OliveProductGrid
          headingLevel={2}
          products={products}
          priorityCount={4}
          emptyHeading="Nothing in this collection yet."
          emptyBody="New pieces land here first — until then, shop everything else."
          emptyCta={{ label: "Shop everything", href: "/shop" }}
        />
      </OliveSection>

      {others.length > 0 ? (
        <OliveSection aria-label="More collections">
          <OliveSectionHeading
            heading="More collections"
            link={{ label: "All collections", href: "/collections" }}
            className="mb-8"
          />
          <OliveRevealGroup
            fan
            className="grid grid-cols-2 gap-3 md:grid-cols-3"
          >
            {others.map((col, i) => {
              const count = col._count.collectionProducts;
              return (
                <OliveCategoryCard
                  key={col.id}
                  image={col.imageUrl ?? "/placeholder.svg"}
                  alt=""
                  label={col.name}
                  href={`/collections/${col.slug}`}
                  chipColor={oliveChipToken(i)}
                  count={`${count} product${count === 1 ? "" : "s"}`}
                  className="olive-reveal-item"
                  style={{ "--i": Math.min(i, 8) } as CSSProperties}
                />
              );
            })}
          </OliveRevealGroup>
        </OliveSection>
      ) : null}
    </div>
  );
}
