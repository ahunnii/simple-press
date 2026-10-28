import type { CSSProperties } from "react";

import type { DefaultCollectionsPageTemplateProps } from "../../types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";

import { resolveFields } from "..";
import {
  hasOliveImage,
  OliveCategoryCard,
  OliveEmptyState,
  OlivePromoSection,
  OliveRevealGroup,
  OliveSection,
  OliveSectionHeading,
} from "../shared";

const HEADING_ID = "olive-collections-heading";
const FEATURED_ID = "olive-collections-featured-heading";

/**
 * OliveCollectionsPage — how the collections are presented, the part of the
 * board the client loves most.
 *
 * Three beats: a Bodoni title and one line; the first collection that has a
 * cover photograph as a full-bleed takeover (the same band the homepage uses
 * for its collection feature); then every other collection as an occasion
 * tile — photograph, centred tracked-caps caption, a quiet piece count. A
 * store with no cover photos at all simply gets tiles.
 *
 * `collections.hero` is the page's one field group (heading block, eyebrow on
 * the feature band, empty-shelf message); the collections themselves are
 * data. It wraps the whole page and is never hidden — an index page with no
 * way back to it would be a dead end.
 */
export function OliveCollectionsPage({
  collections,
  business,
}: DefaultCollectionsPageTemplateProps) {
  const f = resolveFields(business.siteContent?.customFields, [
    "olive.collections.hero-heading",
    "olive.collections.hero-body",
    "olive.collections.featured-eyebrow",
    "olive.collections.empty-heading",
    "olive.collections.empty-body",
  ]);

  const heading = f["olive.collections.hero-heading"] ?? "";
  const body = f["olive.collections.hero-body"] ?? "";
  const eyebrow = f["olive.collections.featured-eyebrow"] ?? "";
  const emptyHeading = f["olive.collections.empty-heading"] ?? "";
  const emptyBody = f["olive.collections.empty-body"] ?? "";

  const featured =
    collections.find((collection) => hasOliveImage(collection.imageUrl)) ??
    null;
  const tiles = collections.filter((collection) => collection !== featured);

  const pieces = (n: number) => `${n} ${n === 1 ? "piece" : "pieces"}`;

  return (
    <div {...sectionGroupAttr("collections", "hero")}>
      <OliveSection
        aria-labelledby={HEADING_ID}
        style={{
          paddingBottom:
            collections.length === 0 ? undefined : "clamp(28px, 4vw, 48px)",
        }}
      >
        <OliveSectionHeading
          as="h1"
          id={HEADING_ID}
          heading={heading}
          body={body}
          headingFieldKey="olive.collections.hero-heading"
          bodyFieldKey="olive.collections.hero-body"
        />

        {collections.length === 0 ? (
          <div className="mt-10 md:mt-12">
            <OliveEmptyState
              headingAs="h2"
              heading={emptyHeading}
              body={emptyBody}
              headingFieldKey="olive.collections.empty-heading"
              bodyFieldKey="olive.collections.empty-body"
              cta={{ label: "Shop everything", href: "/shop" }}
            />
          </div>
        ) : null}
      </OliveSection>

      {featured ? (
        <OlivePromoSection
          takeover
          image={featured.imageUrl ?? ""}
          eyebrow={eyebrow}
          eyebrowField="olive.collections.featured-eyebrow"
          heading={featured.name}
          body={featured.description ?? ""}
          buttonLabel="Shop the collection"
          buttonLink={`/collections/${featured.slug}`}
          id={FEATURED_ID}
        />
      ) : null}

      {tiles.length > 0 ? (
        <OliveSection
          style={{
            paddingTop: featured ? undefined : 0,
          }}
        >
          <OliveRevealGroup className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-12">
            {tiles.map((collection, i) => (
              <OliveCategoryCard
                key={collection.id}
                image={collection.imageUrl ?? ""}
                alt=""
                label={collection.name}
                href={`/collections/${collection.slug}`}
                count={pieces(collection._count.collectionProducts)}
                aspect="4 / 5"
                priority={!featured && i < 3}
                sizes="(max-width: 1024px) 50vw, 33vw"
                className="olive-reveal-item"
                style={{ "--i": Math.min(i, 8) } as CSSProperties}
              />
            ))}
          </OliveRevealGroup>
        </OliveSection>
      ) : null}
    </div>
  );
}
