import type { CSSProperties } from "react";
import Image from "next/image";

import type { DefaultCollectionPageTemplateProps } from "../../types";
import type { OliveCardProduct } from "../shared";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

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

const HEADING_ID = "olive-collection-heading";

/**
 * OliveCollectionPage — one collection, opened flat.
 *
 * With a cover photograph the header is a takeover in miniature: the photo
 * full-bleed under the left-weighted scrim, breadcrumb, eyebrow, Bodoni h1 and
 * the description printed straight on it. Without one it is a plain ivory
 * header — breadcrumb, h1, description — so a collection nobody has
 * photographed yet is not a hole. Then the four-up product grid, and a row of
 * occasion tiles for the other collections.
 *
 * Driven by the collection record itself, plus a small `collections.detail`
 * group (empty-collection message, "More collections" heading) and the shared
 * `featured-eyebrow` field. The route already 404s for an unpublished
 * collection before this ever renders.
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
    "olive.collections.featured-eyebrow",
  ]);

  // resolveFields returns "" for a blank field, so a blank one falls back.
  const orElse = (value: string, fallback: string) =>
    value.trim() ? value : fallback;
  const emptyHeading = orElse(
    f["olive.collections.detail-empty-heading"] ?? "",
    "Nothing in this collection yet.",
  );
  const emptyBody = orElse(
    f["olive.collections.detail-empty-body"] ?? "",
    "New pieces land here first — until then, shop everything else.",
  );
  const moreHeading = orElse(
    f["olive.collections.more-heading"] ?? "",
    "More collections",
  );
  const eyebrow = f["olive.collections.featured-eyebrow"] ?? "";

  const hasCover = hasOliveImage(collection.imageUrl);
  const description = collection.description ?? "";

  const breadcrumb = (
    <OliveBreadcrumb
      items={[
        { label: "Home", href: "/" },
        { label: "Collections", href: "/collections" },
        { label: collection.name },
      ]}
    />
  );

  return (
    <div>
      {hasCover ? (
        <section
          aria-labelledby={HEADING_ID}
          className="olive-collection-hero relative flex w-full items-end overflow-hidden"
          style={{ backgroundColor: "var(--olive-espresso)" }}
        >
          <Image
            src={collection.imageUrl ?? ""}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <span
            aria-hidden="true"
            className="olive-photo-scrim pointer-events-none absolute inset-0"
          />
          <div
            className="olive-on-photo relative mx-auto w-full"
            style={{
              maxWidth: "var(--olive-container)",
              paddingInline: "var(--olive-section-pad-x)",
              paddingBlock: "clamp(28px, 5vw, 56px)",
            }}
          >
            <OliveReveal className="flex max-w-[36rem] flex-col items-start gap-5">
              {breadcrumb}
              <div className="flex flex-col gap-3">
                {eyebrow ? (
                  <p
                    className="olive-eyebrow"
                    {...fieldAttr("olive.collections.featured-eyebrow")}
                  >
                    {eyebrow}
                  </p>
                ) : null}
                <h1 id={HEADING_ID} className="olive-h1">
                  {collection.name}
                </h1>
              </div>
              {description ? (
                <p
                  className="max-w-[46ch] text-[0.9375rem] leading-[1.7]"
                  style={{ color: "var(--olive-on-dark)" }}
                >
                  {description}
                </p>
              ) : null}
            </OliveReveal>
          </div>
        </section>
      ) : (
        <OliveSection
          aria-labelledby={HEADING_ID}
          style={{ paddingBottom: "clamp(24px, 4vw, 40px)" }}
        >
          <OliveReveal className="flex flex-col gap-6">
            {breadcrumb}
            <OliveSectionHeading
              as="h1"
              id={HEADING_ID}
              heading={collection.name}
              body={description || undefined}
            />
          </OliveReveal>
        </OliveSection>
      )}

      <OliveSection
        aria-label={`${collection.name} products`}
        style={{ paddingTop: hasCover ? undefined : 0 }}
        {...sectionGroupAttr("collections", "detail")}
      >
        <OliveProductGrid
          headingLevel={2}
          products={products}
          columns={4}
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
            caps
            heading={moreHeading}
            headingFieldKey="olive.collections.more-heading"
            link={{ label: "All collections", href: "/collections" }}
            className="mb-8 md:mb-10"
          />
          <OliveRevealGroup className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:gap-x-6">
            {others.map((col, i) => {
              const count = col._count.collectionProducts;
              return (
                <OliveCategoryCard
                  key={col.id}
                  image={col.imageUrl ?? ""}
                  alt=""
                  label={col.name}
                  href={`/collections/${col.slug}`}
                  count={`${count} ${count === 1 ? "piece" : "pieces"}`}
                  sizes="(max-width: 768px) 50vw, 33vw"
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
