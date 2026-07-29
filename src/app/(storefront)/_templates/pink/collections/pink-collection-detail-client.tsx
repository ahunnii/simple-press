"use client";

import { useMemo, useState } from "react";

import type { DefaultCollectionPageTemplateProps } from "../../types";
import { formatPrice } from "~/lib/prices";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { PinkEmptyState } from "../shared/pink-empty-state";
import type { PinkFilterChipItem } from "../shared/pink-filter-chips";
import { PinkFilterChips } from "../shared/pink-filter-chips";
import { PinkProductCard } from "../shared/pink-product-card";
import { PinkReveal } from "../shared/pink-reveal";

type CollectionProductRow =
  NonNullable<DefaultCollectionPageTemplateProps["collection"]>["collectionProducts"][number];

type Copy = {
  headingPrefix: string;
  filterAll: string;
  filterAvailable: string;
  filterArchive: string;
  soldLabel: string;
  soldBadge: string;
  soldCta: string;
};

type Props = {
  rows: CollectionProductRow[];
  copy: Copy;
};

function isRowInStock(product: CollectionProductRow["product"]): boolean {
  if (!product) return false;
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
  return (product.inventoryQty ?? 0) > 0;
}

function effectivePrice(product: NonNullable<CollectionProductRow["product"]>): number {
  return product.variants.length > 0
    ? Math.min(...product.variants.map((v) => v.price ?? product.price))
    : product.price;
}

/**
 * `collections.detail-grid` (design.md → Collections → "collections.detail-grid").
 * Local filter state only — small enough not to warrant `useShopFilters`.
 */
export function PinkCollectionDetailClient({ rows, copy }: Props) {
  const [filter, setFilter] = useState<"all" | "available" | "archive">("all");

  const products = useMemo(
    () => rows.map((r) => r.product).filter((p): p is NonNullable<typeof p> => p != null),
    [rows],
  );

  const filtered = useMemo(() => {
    if (filter === "available") return products.filter(isRowInStock);
    if (filter === "archive") return products.filter((p) => !isRowInStock(p));
    return products;
  }, [products, filter]);

  const chips: PinkFilterChipItem[] = [
    { id: "all", label: copy.filterAll },
    { id: "available", label: copy.filterAvailable },
    { id: "archive", label: copy.filterArchive },
  ];

  return (
    <section
      aria-label="Pieces in this series"
      className="px-5 py-12 md:px-10"
      {...sectionGroupAttr("collections", "detail-grid")}
    >
      <div className="mx-auto max-w-[1400px]">
        <div
          className="mb-6 flex flex-wrap items-center justify-between gap-4 pb-4"
          style={{ borderBottom: "1px solid var(--pink-ink)" }}
        >
          <h2 className="pink-display" style={{ fontSize: "clamp(24px, 2.6vw, 32px)", fontWeight: 600 }}>
            <span {...fieldAttr("pink.collections.detail-grid-heading-prefix")}>{copy.headingPrefix}</span>{" "}
            {products.length}
          </h2>
          <PinkFilterChips items={chips} activeId={filter} onSelect={(id) => setFilter(id as typeof filter)} aria-label="Filter pieces" />
        </div>

        {filtered.length === 0 ? (
          products.length === 0 ? (
            <PinkEmptyState
              heading="No pieces in this series yet."
              body="Check back soon, or see what's in the shop now."
              ctaLabel="Go to the shop"
              ctaHref="/shop"
            />
          ) : (
            <PinkEmptyState heading="No pieces here." body="Try a different filter." />
          )
        ) : (
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {filtered.map((product, i) => {
              const inStock = isRowInStock(product);
              return (
                <PinkReveal key={product.id} index={i % 8}>
                  <PinkProductCard
                    href={`/shop/${product.slug}`}
                    imageUrl={product.images[0]?.url}
                    imageAlt={product.name}
                    title={product.name}
                    price={inStock ? formatPrice(effectivePrice(product)) : copy.soldLabel}
                    badge={inStock ? undefined : { label: copy.soldBadge, tone: "ink" }}
                    addToBasket={
                      inStock
                        ? undefined
                        : { label: copy.soldCta, disabled: true, onClick: () => undefined }
                    }
                  />
                </PinkReveal>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
