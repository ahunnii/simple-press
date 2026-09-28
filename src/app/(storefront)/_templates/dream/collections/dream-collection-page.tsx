import Link from "next/link";

import type { DefaultCollectionPageTemplateProps } from "../../types";
import type { Product } from "~/types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { navHrefFlag } from "~/app/(storefront)/_components/nav";

import { resolveFields } from "..";
import { DreamGenericCoverHero } from "../generic/dream-generic-cover-hero";
import { DreamButton } from "../shared/dream-button";
import { DreamHeading } from "../shared/dream-heading";
import { DreamPageHero } from "../shared/dream-page-hero";
import { DreamSection } from "../shared/dream-section";
import { DreamShopCard } from "../shop/dream-shop-card";
import { DreamCollectionCard } from "./dream-collection-card";

const FIELD_KEYS = [
  "dream.collections.detail-empty-heading",
  "dream.collections.detail-empty-body",
  "dream.collections.detail-empty-cta-label",
  "dream.collections.detail-empty-cta-url",
  "dream.collections.detail-more-heading",
];

/**
 * `/collections/<slug>` — cover hero (banner image) or the `DreamPageHero`
 * masthead fallback when the collection has no image (same cover/masthead
 * branch as `DreamGenericPage`), product grid sharing TP5's
 * `DreamShopCard` (same card and grid as /shop), and an always-present "more collections" cross-sell so
 * the page never dead-ends (parity-plan-2026-09-28 PF18). Purely data-driven
 * beyond the `collections.detail` empty-state + heading fields — the
 * collection's own name/description/image are Collection data, not owner
 * copy.
 */
export async function DreamCollectionPage({
  business,
  collection,
  additionalCollections,
}: DefaultCollectionPageTemplateProps) {
  const customFields = business.siteContent?.customFields;
  const f = resolveFields(customFields, FIELD_KEYS);

  const products = collection.collectionProducts
    .map((cp) => cp.product)
    .filter((p): p is NonNullable<typeof p> => p != null);

  const others = (additionalCollections ?? [])
    .filter((c) => c.slug !== collection.slug)
    .slice(0, 3);

  // TP6 contract: links to /shop or /collections from this page hide (never
  // swap destination) when the flag they name is off.
  const { isEnabled } = await getBusinessFlags();
  const collectionsFlag = navHrefFlag("/collections");
  const showCollectionsLink =
    collectionsFlag === null || isEnabled(collectionsFlag);

  const emptyCtaUrlRaw = f["dream.collections.detail-empty-cta-url"] ?? "";
  const emptyCtaFlag = navHrefFlag(emptyCtaUrlRaw);
  const showEmptyCta =
    emptyCtaUrlRaw !== "" &&
    (emptyCtaFlag === null || isEnabled(emptyCtaFlag)) &&
    (f["dream.collections.detail-empty-cta-label"] ?? "").trim() !== "";

  const hasCover = !!collection.imageUrl;

  return (
    <>
      {hasCover ? (
        <DreamGenericCoverHero
          image={collection.imageUrl!}
          title={collection.name}
          excerpt={collection.description ?? undefined}
        />
      ) : (
        <DreamPageHero
          logoUrl={
            business.siteContent?.logoUrl ?? "/templates/dream/images/logo.webp"
          }
          logoAlt={resolveLogoAlt(
            business.siteContent?.logoAltText,
            business.name ?? "",
          )}
          title={collection.name}
          lede={collection.description ?? ""}
        />
      )}

      <DreamSection
        sectionAttrs={sectionGroupAttr("collections", "detail")}
        aria-label={collection.name}
      >
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0 text-[14px] text-[var(--dream-soft)]">
            <li>
              <Link href="/" className="dream-link">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              {showCollectionsLink ? (
                <Link href="/collections" className="dream-link">
                  Collections
                </Link>
              ) : (
                <span>Collections</span>
              )}
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-[var(--dream-ink)]">
              {collection.name}
            </li>
          </ol>
        </nav>

        <p className="mb-8 text-[14px] text-[var(--dream-soft)] tabular-nums">
          {products.length} {products.length === 1 ? "product" : "products"}
        </p>

        {products.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <DreamHeading
              as="h2"
              fieldKey="dream.collections.detail-empty-heading"
            >
              {f["dream.collections.detail-empty-heading"] ?? ""}
            </DreamHeading>
            {f["dream.collections.detail-empty-body"] ? (
              <p
                {...fieldAttr("dream.collections.detail-empty-body")}
                className="max-w-[60ch] text-[16px] leading-relaxed text-[var(--dream-soft)]"
              >
                {f["dream.collections.detail-empty-body"]}
              </p>
            ) : null}
            {showEmptyCta ? (
              <DreamButton
                href={emptyCtaUrlRaw}
                variant="primary"
                className="mt-2"
              >
                <span
                  {...fieldAttr("dream.collections.detail-empty-cta-label")}
                >
                  {f["dream.collections.detail-empty-cta-label"]}
                </span>
              </DreamButton>
            ) : null}
          </div>
        ) : (
          <ul className="m-0 grid list-none grid-cols-2 gap-x-4 gap-y-10 p-0 sm:gap-x-6 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-14">
            {products.map((product) => (
              <li key={product.id} className="min-w-0">
                <DreamShopCard product={product as Product} />
              </li>
            ))}
          </ul>
        )}
      </DreamSection>

      {others.length > 0 && (
        <DreamSection
          tone="sky"
          sectionAttrs={sectionGroupAttr("collections", "detail")}
        >
          <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <DreamHeading
              as="h2"
              fieldKey="dream.collections.detail-more-heading"
            >
              {f["dream.collections.detail-more-heading"] ?? ""}
            </DreamHeading>
            {showCollectionsLink ? (
              <Link
                href="/collections"
                className="dream-link shrink-0 self-start sm:self-auto"
              >
                All collections
              </Link>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-3">
            {others.map((col) => (
              <DreamCollectionCard key={col.id} collection={col} />
            ))}
          </div>
        </DreamSection>
      )}
    </>
  );
}
