import Image from "next/image";
import Link from "next/link";

import type { DefaultCollectionPageTemplateProps } from "../../types";
import type { TemplateListRow } from "~/lib/template-fields";
import { parseTemplateListRows } from "~/lib/template-fields";
import { formatPrice } from "~/lib/prices";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";

import { resolveFields } from "../index";
import { PinkDarkBand } from "../shared/pink-dark-band";
import { PinkEyebrow } from "../shared/pink-eyebrow";
import type { PinkFactRow } from "../shared/pink-fact-rows";
import { PinkFactRows } from "../shared/pink-fact-rows";
import { PinkPhotoHeader } from "../shared/pink-photo-header";
import { PinkCollectionDetailClient } from "./pink-collection-detail-client";

const FIELD_KEYS = [
  "pink.collections.detail-hero-eyebrow-prefix",
  "pink.collections.detail-hero-fact-pieces-label",
  "pink.collections.detail-hero-fact-available-label",
  "pink.collections.detail-hero-fact-price-label",
  "pink.collections.detail-intro-eyebrow",
  "pink.collections.detail-intro-heading",
  "pink.collections.detail-grid-heading-prefix",
  "pink.collections.detail-grid-filter-all",
  "pink.collections.detail-grid-filter-available",
  "pink.collections.detail-grid-filter-archive",
  "pink.collections.detail-grid-sold-label",
  "pink.collections.detail-grid-sold-badge",
  "pink.collections.detail-grid-sold-cta",
  "pink.collections.detail-nav-prev-label",
  "pink.collections.detail-nav-next-label",
];

// Empty `image` on purpose — the band collapses until the owner adds a real
// photo, rather than showing a row of placeholder slabs (same rule as the
// homepage events mosaic and the about gallery).
const DEFAULT_GALLERY: TemplateListRow[] = [
  { _id: "default-g-1", image: "", colSpan: "2", rowSpan: "1" },
  { _id: "default-g-2", image: "", colSpan: "1", rowSpan: "1" },
  { _id: "default-g-3", image: "", colSpan: "1", rowSpan: "1" },
  { _id: "default-g-4", image: "", colSpan: "2", rowSpan: "1" },
];

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
 * Collection detail — design.md → "Per-page section concepts → Collections"
 * (`collections.detail-*` groups). Fact rows and series numbering are
 * derived from the collection record and its siblings; only chrome/labels
 * come from fields.
 */
export function PinkCollectionPage({
  business,
  collection,
  additionalCollections,
}: DefaultCollectionPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, string>
    | undefined;
  const f = resolveFields(customFields, FIELD_KEYS);

  const products = collection.collectionProducts
    .map((cp) => cp.product)
    .filter((p): p is NonNullable<typeof p> => p != null);

  const pieceCount = products.length;
  const availableCount = products.filter(isRowInStock).length;
  const prices = products.map((p) =>
    p.variants.length > 0 ? Math.min(...p.variants.map((v) => v.price ?? p.price)) : p.price,
  );
  const fromPrice = prices.length > 0 ? Math.min(...prices) : null;

  const siblings = additionalCollections ?? [];
  const currentIndex = siblings.findIndex((c) => c.slug === collection.slug);
  const seriesNumber = currentIndex >= 0 ? currentIndex + 1 : 1;
  const prevCollection = currentIndex > 0 ? siblings[currentIndex - 1] : undefined;
  const nextCollection =
    currentIndex >= 0 && currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : undefined;

  const factRows: PinkFactRow[] = [
    { label: f["pink.collections.detail-hero-fact-pieces-label"] ?? "Pieces", value: String(pieceCount) },
    { label: f["pink.collections.detail-hero-fact-available-label"] ?? "Available", value: String(availableCount) },
  ];
  if (fromPrice != null) {
    factRows.push({
      label: f["pink.collections.detail-hero-fact-price-label"] ?? "From",
      value: formatPrice(fromPrice),
    });
  }

  const galleryRows = parseTemplateListRows(customFields?.["pink.collections.detail-gallery-images"]);
  const gallery = galleryRows.length > 0 ? galleryRows : DEFAULT_GALLERY;

  const introVisible = isSectionVisible(customFields, "pink", "collections.detail-intro");
  const galleryVisible = isSectionVisible(customFields, "pink", "collections.detail-gallery");
  const navVisible = isSectionVisible(customFields, "pink", "collections.detail-nav");

  return (
    <>
      <PinkPhotoHeader
        imageUrl={collection.imageUrl ?? ""}
        imageAlt={collection.name}
        minHeight="62vh"
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Collections", href: "/collections" },
          { label: collection.name },
        ]}
        eyebrow={`${f["pink.collections.detail-hero-eyebrow-prefix"] ?? "Series"} ${String(seriesNumber).padStart(2, "0")} · ${new Date(collection.createdAt).getFullYear()}`}
        heading={collection.name}
        intro={collection.description ?? undefined}
        factRows={<PinkFactRows rows={factRows} />}
        sectionAttrs={sectionGroupAttr("collections", "detail-hero")}
      />

      {introVisible && collection.description && (
        <section
          aria-label="About this series"
          className="px-5 py-14 md:px-10"
          {...sectionGroupAttr("collections", "detail-intro")}
        >
          <div className="mx-auto grid max-w-[1400px] gap-8 md:grid-cols-[0.62fr_1fr] md:gap-14">
            <div className="flex flex-col gap-3">
              <PinkEyebrow tone="paper" fieldKey="pink.collections.detail-intro-eyebrow">
                {f["pink.collections.detail-intro-eyebrow"] ?? ""}
              </PinkEyebrow>
              <h2
                className="pink-display"
                style={{ fontSize: "clamp(26px, 2.8vw, 38px)", fontWeight: 600, letterSpacing: "-0.025em" }}
                {...fieldAttr("pink.collections.detail-intro-heading")}
              >
                {f["pink.collections.detail-intro-heading"] ?? ""}
              </h2>
            </div>
            <p
              className="max-w-[62ch] text-[17px] leading-[1.8] whitespace-pre-line"
              style={{ color: "var(--pink-body)" }}
            >
              {collection.description}
            </p>
          </div>
        </section>
      )}

      {galleryVisible && gallery.some((row) => typeof row.image === "string" && row.image) && (
        <section
          aria-label="Series gallery"
          className="px-[2px]"
          {...sectionGroupAttr("collections", "detail-gallery")}
        >
          <div
            className="grid gap-[2px]"
            style={{ gridTemplateColumns: "repeat(4, 1fr)", gridAutoRows: "180px" }}
          >
            {gallery.slice(0, 6).map((row, i) => {
              const colSpan = Number(row.colSpan ?? 1) || 1;
              const rowSpan = Number(row.rowSpan ?? 1) || 1;
              return (
                <div
                  key={typeof row._id === "string" ? row._id : i}
                  className="relative overflow-hidden"
                  style={{ gridColumn: `span ${colSpan}`, gridRow: `span ${rowSpan}` }}
                >
                  <Image
                    src={typeof row.image === "string" && row.image ? row.image : "/placeholder.svg"}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}

      <PinkCollectionDetailClient
        rows={collection.collectionProducts}
        copy={{
          headingPrefix: f["pink.collections.detail-grid-heading-prefix"] ?? "The",
          filterAll: f["pink.collections.detail-grid-filter-all"] ?? "All",
          filterAvailable: f["pink.collections.detail-grid-filter-available"] ?? "Available",
          filterArchive: f["pink.collections.detail-grid-filter-archive"] ?? "Archive",
          soldLabel: f["pink.collections.detail-grid-sold-label"] ?? "Sold",
          soldBadge: f["pink.collections.detail-grid-sold-badge"] ?? "Rehomed",
          soldCta: f["pink.collections.detail-grid-sold-cta"] ?? "Ask for a commission",
        }}
      />

      {navVisible && (prevCollection ?? nextCollection) && (
        <PinkDarkBand ariaLabel="More series" sectionAttrs={sectionGroupAttr("collections", "detail-nav")}>
          <div className="grid gap-[2px] sm:grid-cols-2">
            <Link
              href={prevCollection ? `/collections/${prevCollection.slug}` : "/collections"}
              className="flex flex-col gap-2 p-8"
              style={{ background: "var(--pink-ink-panel)", pointerEvents: prevCollection ? "auto" : "none" }}
              aria-disabled={!prevCollection}
            >
              <span {...fieldAttr("pink.collections.detail-nav-prev-label")} className="pink-label-dark">
                {f["pink.collections.detail-nav-prev-label"] ?? "Previous series"}
              </span>
              <span className="pink-display" style={{ fontSize: "22px", fontWeight: 600, color: "var(--pink-paper)" }}>
                {prevCollection?.name ?? "—"}
              </span>
            </Link>
            <Link
              href={nextCollection ? `/collections/${nextCollection.slug}` : "/collections"}
              className="flex flex-col items-end gap-2 p-8 text-right"
              style={{ background: "var(--pink-ink-panel)", pointerEvents: nextCollection ? "auto" : "none" }}
              aria-disabled={!nextCollection}
            >
              <span {...fieldAttr("pink.collections.detail-nav-next-label")} className="pink-label-dark">
                {f["pink.collections.detail-nav-next-label"] ?? "Next series"}
              </span>
              <span className="pink-display" style={{ fontSize: "22px", fontWeight: 600, color: "var(--pink-paper)" }}>
                {nextCollection?.name ?? "—"}
              </span>
            </Link>
          </div>
        </PinkDarkBand>
      )}
    </>
  );
}
