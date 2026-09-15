import type { CSSProperties } from "react";

import type { DefaultCollectionsPageTemplateProps } from "../../types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";

import { resolveFields } from "..";
import {
  OliveCategoryCard,
  OliveEmptyState,
  OliveRevealGroup,
  OliveSection,
  OliveSectionHeading,
} from "../shared";
import { oliveChipToken } from "../shared/olive-color";

const HEADING_ID = "olive-collections-heading";

/**
 * OliveCollectionsPage — the swatch book's table of contents.
 *
 * design.md defines exactly one field group (`collections.hero`) covering
 * the whole page: the heading block, the empty-shelf message, and the grid
 * of published collections below it (the grid itself is data-driven and
 * carries no fields of its own). The whole page is therefore one section,
 * never hidden — an index page with no way back to it would be a dead end.
 */
export function OliveCollectionsPage({
  collections,
  business,
}: DefaultCollectionsPageTemplateProps) {
  const f = resolveFields(business.siteContent?.customFields, [
    "olive.collections.hero-heading",
    "olive.collections.hero-body",
    "olive.collections.empty-heading",
    "olive.collections.empty-body",
  ]);

  const heading = f["olive.collections.hero-heading"] ?? "";
  const body = f["olive.collections.hero-body"] ?? "";
  const emptyHeading = f["olive.collections.empty-heading"] ?? "";
  const emptyBody = f["olive.collections.empty-body"] ?? "";

  return (
    <OliveSection
      aria-labelledby={HEADING_ID}
      {...sectionGroupAttr("collections", "hero")}
    >
      <div>
        <OliveSectionHeading
          as="h1"
          id={HEADING_ID}
          heading={heading}
          body={body}
          headingFieldKey="olive.collections.hero-heading"
          bodyFieldKey="olive.collections.hero-body"
        />
      </div>

      <div className="mt-10 md:mt-12">
        {collections.length === 0 ? (
          <OliveEmptyState
            heading={emptyHeading}
            body={emptyBody}
            cta={{ label: "Shop everything", href: "/shop" }}
          />
        ) : (
          <OliveRevealGroup
            fan
            className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4"
          >
            {collections.map((collection, i) => {
              const count = collection._count.collectionProducts;
              return (
                <OliveCategoryCard
                  key={collection.id}
                  image={collection.imageUrl ?? "/placeholder.svg"}
                  alt=""
                  label={collection.name}
                  href={`/collections/${collection.slug}`}
                  chipColor={oliveChipToken(i)}
                  count={`${count} product${count === 1 ? "" : "s"}`}
                  priority={i < 4}
                  className="olive-reveal-item"
                  style={{ "--i": Math.min(i, 8) } as CSSProperties}
                />
              );
            })}
          </OliveRevealGroup>
        )}
      </div>
    </OliveSection>
  );
}
