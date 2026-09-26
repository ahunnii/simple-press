import type { CSSProperties } from "react";
import Image from "next/image";

import type { DefaultCollectionPageTemplateProps } from "../../types";
import type { OliveCardProduct } from "../shared";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";

import { resolveFields } from "..";
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
 * Mostly driven by the collection record itself (design.md, "CollectionPage
 * — no fields"), plus a small `collections.detail` field group for the
 * empty-collection message and the "More collections" heading, which are
 * owner copy shared across every collection rather than per-collection data.
 * The route already 404s for an unpublished collection before this ever
 * renders.
 */
export function OliveCollectionPage({
  collection,
  business,
  additionalCollections,
}: DefaultCollectionPageTemplateProps) {
  const products: OliveCardProduct[] = collection.collectionProducts
    .map((cp) => cp.product)
    .filter((p): p is NonNullable<typeof p> => p != null);

  const others = additionalCollections
    .filter((c) => c.slug !== collection.slug)
    .slice(0, 3);

  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields, [
    "olive.collections.detail-empty-heading",
    "olive.collections.detail-empty-body",
    "olive.collections.more-heading",
  ]);

  const emptyHeading =
    f["olive.collections.detail-empty-heading"] ??
    "Nothing in this collection yet.";
  const emptyBody =
    f["olive.collections.detail-empty-body"] ??
    "New pieces land here first — until then, shop everything else.";
  const moreHeading = f["olive.collections.more-heading"] ?? "More collections";

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
        {...sectionGroupAttr("collections", "detail")}
      >
        <OliveProductGrid
          headingLevel={2}
          products={products}
          priorityCount={4}
          emptyHeading={emptyHeading}
          emptyBody={emptyBody}
          emptyHeadingFieldKey="olive.collections.detail-empty-heading"
          emptyBodyFieldKey="olive.collections.detail-empty-body"
          emptyCta={{ label: "Shop everything", href: "/shop" }}
        />
      </OliveSection>

      {others.length > 0 ? (
        <OliveSection
          aria-label="More collections"
          {...sectionGroupAttr("collections", "detail")}
        >
          <OliveSectionHeading
            heading={moreHeading}
            headingFieldKey="olive.collections.more-heading"
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
