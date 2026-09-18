import type { DefaultCollectionsPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { resolveFields } from "..";
import { UmscButton } from "../shared/umsc-button";
import { UmscCollectionDoor } from "../shared/umsc-collection-door";
import { UmscImageFallback } from "../shared/umsc-image-fallback";
import { UmscPageHero } from "../shared/umsc-page-hero";
import { UmscRevealGroup } from "../shared/umsc-reveal";
import { UmscSection } from "../shared/umsc-section";

const FIELD_KEYS = [
  "umsc.collections.hero-heading",
  "umsc.collections.hero-lede",
  "umsc.collections.empty-body",
];

/**
 * UmscCollectionsPage — design.md "Collections": page hero + a doors grid
 * (image 4:5, name, "N items"). Purely a listing — no filters, no client
 * handoff needed.
 */
export function UmscCollectionsPage({
  collections,
  business,
}: DefaultCollectionsPageTemplateProps) {
  const customFields = business.siteContent?.customFields;
  const f = resolveFields(customFields, FIELD_KEYS);
  const list = collections ?? [];

  return (
    <div>
      <UmscPageHero
        heading={f["umsc.collections.hero-heading"] ?? ""}
        headingFieldKey="umsc.collections.hero-heading"
        lede={f["umsc.collections.hero-lede"] ?? ""}
        ledeFieldKey="umsc.collections.hero-lede"
        sectionAttrs={sectionGroupAttr("collections", "hero")}
      />

      <UmscSection tone="paper" aria-label="Collections">
        <h2 className="sr-only">All collections</h2>
        {list.length === 0 ? (
          <div className="flex flex-col items-center gap-5 py-12 text-center">
            <div className="grid w-full max-w-[680px] grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <UmscImageFallback key={i} aspect="4 / 5" />
              ))}
            </div>
            <p
              {...fieldAttr("umsc.collections.empty-body")}
              className="umsc-sans max-w-[46ch] text-[15px] text-[var(--umsc-muted)]"
            >
              {f["umsc.collections.empty-body"] ?? ""}
            </p>
            <UmscButton href="/shop" variant="link">
              Go to the shop
            </UmscButton>
          </div>
        ) : (
          <UmscRevealGroup className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {list.map((collection, i) => (
              <div
                key={collection.id}
                className="umsc-reveal-item"
                style={{ "--i": Math.min(i, 6) } as React.CSSProperties}
              >
                <UmscCollectionDoor
                  href={`/collections/${collection.slug}`}
                  title={collection.name}
                  blurb={`${collection._count.collectionProducts} item${
                    collection._count.collectionProducts !== 1 ? "s" : ""
                  }`}
                  image={collection.imageUrl ?? undefined}
                  aspect="4 / 5"
                />
              </div>
            ))}
          </UmscRevealGroup>
        )}
      </UmscSection>
    </div>
  );
}
