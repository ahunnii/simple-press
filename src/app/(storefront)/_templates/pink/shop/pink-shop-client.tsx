"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import type { Product } from "~/types";
import { formatPrice } from "~/lib/prices";
import { SORT_LABELS, useShopFilters } from "~/hooks/use-shop-filters";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { useCart } from "~/providers/cart-context";

import { PinkEmptyState } from "../shared/pink-empty-state";
import type { PinkFilterChipItem } from "../shared/pink-filter-chips";
import { PinkFilterChips } from "../shared/pink-filter-chips";
import { PinkProductCard } from "../shared/pink-product-card";
import { PinkReveal } from "../shared/pink-reveal";

const PAGE_SIZE = 12;

type FiltersCta = { heading: string; body: string; label: string; href: string };

type Copy = {
  addToBasketLabel: string;
  addedLabel: string;
  chooseOptionsLabel: string;
  soldOutLabel: string;
  loadMoreLabel: string;
  emptyHeading: string;
  emptyBody: string;
  emptyCtaLabel: string;
  emptyCtaHref: string;
};

type Props = {
  products: Product[];
  filtersVisible: boolean;
  filtersCta: FiltersCta;
  copy: Copy;
};

function FilterBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-[30px] first:pt-0">
      <p
        className="pink-label"
        style={{ borderBottom: "1px solid var(--pink-ink)", paddingBottom: "10px" }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}

function AddToBasketButton({
  product,
  copy,
}: {
  product: Product;
  copy: Copy;
}) {
  const { addItem, getItemQuantity } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const hasVariants = product.variants.length > 0;
  const soldOut =
    !hasVariants &&
    product.trackInventory &&
    !product.allowBackorders &&
    (product.inventoryQty ?? 0) - getItemQuantity(product.id, null) <= 0;

  if (hasVariants) {
    return (
      <Link
        href={`/shop/${product.slug}`}
        className="pink-btn mt-3 w-full justify-center px-4 py-3"
        style={{ background: "transparent", borderColor: "var(--pink-ink)", color: "var(--pink-ink)" }}
        {...fieldAttr("pink.shop.choose-options-label")}
      >
        {copy.chooseOptionsLabel}
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={soldOut}
      aria-label={`${soldOut ? copy.soldOutLabel : justAdded ? copy.addedLabel : copy.addToBasketLabel} — ${product.name}`}
      onClick={() => {
        if (soldOut) return;
        addItem({
          productId: product.id,
          productSlug: product.slug,
          variantId: null,
          productName: product.name,
          variantName: null,
          price: product.price,
          compareAtPrice: product.compareAtPrice ?? null,
          imageUrl: product.images[0]?.url ?? null,
          sku: product.sku ?? null,
          maxInventory:
            product.trackInventory && !product.allowBackorders
              ? (product.inventoryQty ?? 0)
              : undefined,
        });
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 2000);
      }}
      className="pink-btn mt-3 w-full justify-center px-4 py-3"
      style={
        soldOut
          ? undefined
          : justAdded
            ? { background: "var(--pink-ink)", borderColor: "var(--pink-ink)", color: "var(--pink-paper)" }
            : { background: "transparent", borderColor: "var(--pink-ink)", color: "var(--pink-ink)" }
      }
      onMouseEnter={(e) => {
        if (soldOut || justAdded) return;
        e.currentTarget.style.borderColor = "var(--pink-rose)";
        e.currentTarget.style.color = "var(--pink-rose)";
      }}
      onMouseLeave={(e) => {
        if (soldOut || justAdded) return;
        e.currentTarget.style.borderColor = "var(--pink-ink)";
        e.currentTarget.style.color = "var(--pink-ink)";
      }}
      {...fieldAttr(
        soldOut
          ? "pink.shop.sold-out-label"
          : justAdded
            ? "pink.shop.add-to-basket-added-label"
            : "pink.shop.add-to-basket-label",
      )}
    >
      {soldOut ? copy.soldOutLabel : justAdded ? copy.addedLabel : copy.addToBasketLabel}
    </button>
  );
}

export function PinkShopClient({ products, filtersVisible, filtersCta, copy }: Props) {
  const {
    sortParam,
    handleSort,
    priceMax,
    maxPrice,
    localPriceMax,
    setLocalPriceMax,
    commitPriceMax,
    inStockOnly,
    handleInStock,
    inStockCount,
    activeCollectionId,
    setActiveCollectionId,
    collections,
    filtered,
    hasActiveFilters,
    clearFilters,
  } = useShopFilters(products);

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filtered.length, sortParam, priceMax, inStockOnly, activeCollectionId]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const sortChips: PinkFilterChipItem[] = Object.entries(SORT_LABELS).map(
    ([id, label]) => ({ id, label }),
  );

  const activeCollectionName = collections.find((c) => c.id === activeCollectionId)?.name;
  const summaryParts: string[] = [];
  if (activeCollectionName) summaryParts.push(activeCollectionName);
  if (inStockOnly) summaryParts.push("in stock");
  const summary = summaryParts.length > 0 ? summaryParts.join(", ") : "All pieces";

  const filterPanel = (
    <>
      <FilterBlock label="Category">
        <div className="flex flex-col items-start gap-2.5">
          <button
            type="button"
            onClick={() => setActiveCollectionId(null)}
            className="flex w-full items-baseline justify-between text-[15px]"
            style={{
              color: !activeCollectionId ? "var(--pink-rose)" : "var(--pink-ink)",
              fontWeight: !activeCollectionId ? 600 : 400,
            }}
          >
            All pieces
          </button>
          {collections.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCollectionId(c.id === activeCollectionId ? null : c.id)}
              className="flex w-full items-baseline justify-between text-[15px]"
              style={{
                color: c.id === activeCollectionId ? "var(--pink-rose)" : "var(--pink-ink)",
                fontWeight: c.id === activeCollectionId ? 600 : 400,
              }}
            >
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      </FilterBlock>

      <FilterBlock label="Price">
        <div
          className="flex justify-between text-[13px]"
          style={{ color: "var(--pink-subtle)" }}
        >
          <span>$0</span>
          <span>{formatPrice(localPriceMax)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={maxPrice || 1000}
          value={localPriceMax}
          aria-label={`Maximum price, currently ${formatPrice(localPriceMax)}`}
          onChange={(e) => setLocalPriceMax(Number(e.target.value))}
          onPointerUp={(e) => commitPriceMax(Number((e.target as HTMLInputElement).value))}
          onKeyUp={() => commitPriceMax(localPriceMax)}
          className="w-full"
        />
      </FilterBlock>

      <FilterBlock label="Availability">
        <label className="flex cursor-pointer items-center gap-2.5 text-[15px]" style={{ color: "var(--pink-ink)" }}>
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => handleInStock(e.target.checked)}
            className="h-[17px] w-[17px]"
          />
          In stock ({inStockCount})
        </label>
      </FilterBlock>

      {(filtersCta.heading || filtersCta.body) && (
        <div className="mt-2 flex flex-col gap-3 p-6" style={{ background: "var(--pink-panel)" }}>
          {filtersCta.heading && (
            <p className="pink-display" style={{ fontSize: "17px", fontWeight: 600 }} {...fieldAttr("pink.shop.filters-cta-heading")}>
              {filtersCta.heading}
            </p>
          )}
          {filtersCta.body && (
            <p className="text-[14px] leading-[1.6]" style={{ color: "var(--pink-muted)" }} {...fieldAttr("pink.shop.filters-cta-body")}>
              {filtersCta.body}
            </p>
          )}
          {filtersCta.label && (
            <Link
              href={filtersCta.href}
              className="pink-btn pink-btn-solid w-fit px-4 py-2.5"
              {...fieldAttr("pink.shop.filters-cta-label")}
            >
              {filtersCta.label}
            </Link>
          )}
        </div>
      )}
    </>
  );

  return (
    <section
      className="px-5 py-10 md:px-10"
      aria-label="Products"
      {...sectionGroupAttr("shop", "grid")}
    >
      <div
        className="mx-auto flex max-w-[1400px] flex-col gap-8 md:grid"
        style={filtersVisible ? { gridTemplateColumns: "232px 1fr", gap: "48px" } : undefined}
      >
        {filtersVisible && (
          <div {...sectionGroupAttr("shop", "filters")}>
            <div className="md:hidden">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen((v) => !v)}
                aria-expanded={mobileFiltersOpen}
                aria-controls="pink-shop-mobile-filters"
                className="pink-btn pink-btn-outline w-full justify-center px-4 py-3"
              >
                {mobileFiltersOpen ? "Hide filters" : "Show filters"}
              </button>
              {mobileFiltersOpen && (
                <div id="pink-shop-mobile-filters" className="mt-4">
                  {filterPanel}
                </div>
              )}
            </div>

            {/* A `<aside>` here is a complementary landmark nested inside
                `<main>`, which axe flags (landmark-complementary-is-top-level).
                A labelled group keeps the accessible name without the landmark. */}
            <div
              role="group"
              className="hidden md:sticky md:top-[var(--pink-sticky-top)] md:block md:self-start"
              aria-label="Product filters"
            >
              {filterPanel}
            </div>
          </div>
        )}

        <div>
          <div
            className="mb-6 flex flex-wrap items-center justify-between gap-4 pb-4"
            style={{ borderBottom: "1px solid var(--pink-ink)" }}
          >
            <p className="text-[14px]" style={{ color: "var(--pink-muted)" }} aria-live="polite" aria-atomic="true">
              Showing {summary}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="ml-3 underline underline-offset-2"
                  style={{ color: "var(--pink-rose)" }}
                >
                  Clear
                </button>
              )}
            </p>
            <PinkFilterChips
              items={sortChips}
              activeId={sortParam}
              onSelect={(id) => handleSort(id as keyof typeof SORT_LABELS)}
              aria-label="Sort products"
            />
          </div>

          {filtered.length === 0 ? (
            <PinkEmptyState
              heading={copy.emptyHeading}
              body={copy.emptyBody}
              ctaLabel={copy.emptyCtaLabel}
              ctaHref={copy.emptyCtaHref}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((product, i) => {
                  const additional = product.additionalFields as
                    | { comingSoon?: boolean }
                    | null;
                  return (
                    <PinkReveal key={product.id} index={i % PAGE_SIZE} as="div">
                      <PinkProductCard
                        href={`/shop/${product.slug}`}
                        imageUrl={product.images[0]?.url}
                        imageAlt={product.name}
                        title={product.name}
                        meta={product.sku ?? undefined}
                        price={formatPrice(product.price)}
                        compareAtPrice={
                          product.compareAtPrice && product.compareAtPrice > product.price
                            ? formatPrice(product.compareAtPrice)
                            : undefined
                        }
                        badge={additional?.comingSoon ? { label: "Coming soon", tone: "ink" } : undefined}
                      />
                      {!additional?.comingSoon && (
                        <AddToBasketButton product={product} copy={copy} />
                      )}
                    </PinkReveal>
                  );
                })}
              </div>

              <div className="mt-12 flex flex-col items-center gap-4">
                <p className="text-[13px]" style={{ color: "var(--pink-subtle)" }}>
                  Showing {visible.length} of {filtered.length}
                </p>
                {hasMore && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    className="pink-btn pink-btn-ghost px-6 py-3"
                    {...fieldAttr("pink.shop.load-more-label")}
                  >
                    {copy.loadMoreLabel}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
