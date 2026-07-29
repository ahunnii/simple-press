import Image from "next/image";
import Link from "next/link";

import type { DefaultCollectionsPageTemplateProps } from "../../types";
import { formatPrice } from "~/lib/prices";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { db } from "~/server/db";

import { resolveFields } from "../index";
import { PinkBadge } from "../shared/pink-badge";
import { PinkDarkBand } from "../shared/pink-dark-band";
import { PinkEmptyState } from "../shared/pink-empty-state";
import { PinkEyebrow } from "../shared/pink-eyebrow";
import { PinkPageHeader } from "../shared/pink-page-header";

const FIELD_KEYS = [
  "pink.collections.header-eyebrow",
  "pink.collections.header-heading",
  "pink.collections.header-intro",
  "pink.collections.featured-badge",
  "pink.collections.featured-cta-label",
  "pink.collections.grid-badge-open",
  "pink.collections.grid-badge-closed",
  "pink.collections.next-eyebrow",
  "pink.collections.next-heading",
  "pink.collections.next-body",
  "pink.collections.next-cta-primary-label",
  "pink.collections.next-cta-primary-href",
  "pink.collections.next-cta-secondary-label",
  "pink.collections.next-cta-secondary-href",
  "pink.collections.next-image-1",
  "pink.collections.next-image-2",
];

type CollStats = { pieces: number; available: number; fromCents: number | null };

function isRowInStock(product: {
  trackInventory: boolean;
  allowBackorders: boolean;
  inventoryQty: number;
  baseInventoryUnit: { inventoryQty: number; allowBackorders: boolean } | null;
  variants: { inventoryQty: number }[];
}): boolean {
  if (product.baseInventoryUnit) {
    return (
      product.baseInventoryUnit.allowBackorders ||
      product.baseInventoryUnit.inventoryQty > 0
    );
  }
  if (!product.trackInventory) return true;
  if (product.allowBackorders) return true;
  if (product.variants.length > 0) {
    return product.variants.some((v) => v.inventoryQty > 0);
  }
  return product.inventoryQty > 0;
}

/**
 * Builds a per-collection stats map (piece count, available count, cheapest
 * price) via one tenant-scoped `CollectionProduct` query — used by both the
 * featured card and the grid, avoiding N+1 lookups (design.md → Collections
 * → "collections.featured" / "collections.grid" meta rows).
 */
async function buildCollectionStats(businessId: string): Promise<Map<string, CollStats>> {
  const rows = await db.collectionProduct.findMany({
    where: { collection: { businessId, published: true } },
    select: {
      collectionId: true,
      product: {
        select: {
          price: true,
          trackInventory: true,
          allowBackorders: true,
          inventoryQty: true,
          baseInventoryUnit: { select: { inventoryQty: true, allowBackorders: true } },
          variants: { select: { price: true, inventoryQty: true } },
        },
      },
    },
  });

  const map = new Map<string, CollStats>();
  for (const row of rows) {
    const stats = map.get(row.collectionId) ?? { pieces: 0, available: 0, fromCents: null };
    stats.pieces += 1;
    if (isRowInStock(row.product)) stats.available += 1;
    const effectivePrice =
      row.product.variants.length > 0
        ? Math.min(...row.product.variants.map((v) => v.price ?? row.product.price))
        : row.product.price;
    stats.fromCents = stats.fromCents === null ? effectivePrice : Math.min(stats.fromCents, effectivePrice);
    map.set(row.collectionId, stats);
  }
  return map;
}

/**
 * Collections index — design.md → "Per-page section concepts → Collections".
 */
export async function PinkCollectionsPage({ collections, business }: DefaultCollectionsPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, string>
    | undefined;
  const f = resolveFields(customFields, FIELD_KEYS);

  const list = collections ?? [];
  const statsMap = await buildCollectionStats(business.id);

  const featured = list[0];
  const rest = list.slice(1);

  const featuredVisible = isSectionVisible(customFields, "pink", "collections.featured");
  const nextVisible = isSectionVisible(customFields, "pink", "collections.next");

  return (
    <>
      <PinkPageHeader
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Collections" }]}
        eyebrow={f["pink.collections.header-eyebrow"] ?? ""}
        eyebrowFieldKey="pink.collections.header-eyebrow"
        heading={f["pink.collections.header-heading"] ?? ""}
        headingFieldKey="pink.collections.header-heading"
        sectionAttrs={sectionGroupAttr("collections", "header")}
        rightSlot={
          f["pink.collections.header-intro"] ? (
            <p
              className="max-w-[40ch] text-[17px] leading-[1.7]"
              style={{ color: "var(--pink-ink-body)" }}
              {...fieldAttr("pink.collections.header-intro")}
            >
              {f["pink.collections.header-intro"]}
            </p>
          ) : undefined
        }
      />

      {list.length === 0 ? (
        <div className="px-5 py-16 md:px-10">
          <PinkEmptyState
            heading="No collections yet."
            body="Series get added here as they're finished. Check back soon."
            ctaLabel="Go to the shop"
            ctaHref="/shop"
          />
        </div>
      ) : (
        <>
          {featuredVisible && featured && (
            <section
              aria-label="Featured collection"
              className="px-5 py-10 md:px-10"
              {...sectionGroupAttr("collections", "featured")}
            >
              <div
                className="mx-auto grid max-w-[1400px] gap-0 transition-colors sm:grid-cols-[1.15fr_0.85fr]"
                style={{ border: "1px solid var(--pink-line)", background: "var(--pink-white)" }}
              >
                <Link href={`/collections/${featured.slug}`} className="relative block overflow-hidden" style={{ aspectRatio: "16 / 10" }}>
                  <Image
                    src={featured.imageUrl ?? "/placeholder.svg"}
                    alt={featured.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 60vw"
                  />
                  {f["pink.collections.featured-badge"] && (
                    <span className="absolute top-3 left-3" {...fieldAttr("pink.collections.featured-badge")}>
                      <PinkBadge>{f["pink.collections.featured-badge"]}</PinkBadge>
                    </span>
                  )}
                </Link>
                <div className="flex flex-col justify-center gap-4 p-8 md:p-10">
                  <PinkEyebrow tone="paper">Featured series</PinkEyebrow>
                  <h2
                    className="pink-display"
                    style={{ fontSize: "clamp(24px, 2.6vw, 34px)", fontWeight: 600, letterSpacing: "-0.02em" }}
                  >
                    {featured.name}
                  </h2>
                  {featured.description && (
                    <p className="max-w-[46ch] text-[16px] leading-[1.7]" style={{ color: "var(--pink-body)" }}>
                      {featured.description}
                    </p>
                  )}
                  <p className="text-[13px]" style={{ color: "var(--pink-subtle)" }}>
                    {(() => {
                      const stats = statsMap.get(featured.id);
                      return (
                        <>
                          {stats?.pieces ?? 0} pieces · {stats?.available ?? 0} available
                          {stats?.fromCents != null && ` · from ${formatPrice(stats.fromCents)}`}
                        </>
                      );
                    })()}
                  </p>
                  <Link
                    href={`/collections/${featured.slug}`}
                    className="mt-2 w-fit text-[15px] font-semibold"
                    style={{ color: "var(--pink-rose)" }}
                    {...fieldAttr("pink.collections.featured-cta-label")}
                  >
                    {f["pink.collections.featured-cta-label"] ?? ""}
                  </Link>
                </div>
              </div>
            </section>
          )}

          <section aria-label="All collections" className="px-5 pb-16 md:px-10" {...sectionGroupAttr("collections", "grid")}>
            <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {(featuredVisible ? rest : list).map((collection) => {
                const stats = statsMap.get(collection.id);
                const open = (stats?.available ?? 0) > 0;
                return (
                  <Link key={collection.id} href={`/collections/${collection.slug}`} className="pink-lift flex flex-col">
                    <div className="relative overflow-hidden" style={{ aspectRatio: "4 / 3", background: "var(--pink-panel)" }}>
                      <Image
                        src={collection.imageUrl ?? "/placeholder.svg"}
                        alt={collection.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                      <span className="absolute top-2.5 left-2.5">
                        <PinkBadge tone={open ? "rose" : "ink"}>
                          {open ? (f["pink.collections.grid-badge-open"] ?? "Open") : (f["pink.collections.grid-badge-closed"] ?? "Closed")}
                        </PinkBadge>
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 pt-3" style={{ borderTop: "1px solid var(--pink-ink)" }}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="pink-display" style={{ fontSize: "18px", fontWeight: 600 }}>
                          {collection.name}
                        </span>
                        <span className="text-[13px]" style={{ color: "var(--pink-subtle)" }}>
                          {collection._count.collectionProducts}
                        </span>
                      </div>
                      {collection.description && (
                        <p className="line-clamp-2 text-[14px] leading-[1.6]" style={{ color: "var(--pink-muted)" }}>
                          {collection.description}
                        </p>
                      )}
                      <p className="text-[13px]" style={{ color: "var(--pink-subtle)" }}>
                        {new Date(collection.createdAt).getFullYear()}
                        {stats?.fromCents != null && ` · from ${formatPrice(stats.fromCents)}`}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </>
      )}

      {nextVisible && (
        <PinkDarkBand ariaLabel="What's coming" sectionAttrs={sectionGroupAttr("collections", "next")}>
          <div className="grid gap-10 md:grid-cols-[1fr_0.9fr] md:items-center md:gap-14">
            <div className="flex flex-col gap-4">
              <PinkEyebrow tone="dark" fieldKey="pink.collections.next-eyebrow">
                {f["pink.collections.next-eyebrow"] ?? ""}
              </PinkEyebrow>
              <h2
                className="pink-display max-w-[24ch]"
                style={{ fontSize: "clamp(26px, 2.8vw, 38px)", fontWeight: 600, letterSpacing: "-0.025em" }}
                {...fieldAttr("pink.collections.next-heading")}
              >
                {f["pink.collections.next-heading"] ?? ""}
              </h2>
              <p
                className="max-w-[52ch] text-[16px] leading-[1.7]"
                style={{ color: "var(--pink-ink-body)" }}
                {...fieldAttr("pink.collections.next-body")}
              >
                {f["pink.collections.next-body"] ?? ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                {f["pink.collections.next-cta-primary-label"] && (
                  <Link href={f["pink.collections.next-cta-primary-href"] ?? "/contact"} className="pink-btn pink-btn-solid px-5 py-3">
                    {f["pink.collections.next-cta-primary-label"]}
                  </Link>
                )}
                {f["pink.collections.next-cta-secondary-label"] && (
                  <Link href={f["pink.collections.next-cta-secondary-href"] ?? "/shop"} className="pink-btn pink-btn-ghost px-5 py-3">
                    {f["pink.collections.next-cta-secondary-label"]}
                  </Link>
                )}
              </div>
            </div>
            {/* Unset images stay bare on the band's own ink surface — light
                placeholder slabs read as broken images here. */}
            <div className="grid grid-cols-2 gap-[2px]">
              {[f["pink.collections.next-image-1"], f["pink.collections.next-image-2"]].map((src, i) => (
                <div
                  key={i}
                  className="relative aspect-square overflow-hidden"
                  style={{ background: "var(--pink-ink-tint)" }}
                >
                  {src ? (
                    <Image src={src} alt="" fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </PinkDarkBand>
      )}
    </>
  );
}
