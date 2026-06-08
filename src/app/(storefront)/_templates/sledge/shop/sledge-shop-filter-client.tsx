"use client";

import { useState } from "react";
import Link from "next/link";
import { SlidersHorizontal, X } from "lucide-react";

import type { SortOption } from "~/hooks/use-shop-filters";
import type { Product } from "~/types";
import { formatPrice } from "~/lib/prices";
import { SORT_LABELS, useShopFilters } from "~/hooks/use-shop-filters";
import { cn } from "~/lib/utils";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { NoiseProductCard } from "../shared/sledge-product-card";

type CollectionEntry = {
  id: string;
  name: string;
  slug: string;
  count: number;
};

type Props = {
  products: Product[];
  heading: string;
  collections?: CollectionEntry[];
};

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="sl-shop-filter-group">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-1"
      >
        <span className="sl-shop-filter-title">{title}</span>
        <span aria-hidden="true" className="sl-shop-filter-toggle">
          {open ? "−" : "+"}
        </span>
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function SledgeShopFilterClient({ products, collections = [] }: Props) {
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
    filtered,
    clearFilters,
  } = useShopFilters(products);

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const filterPanel = (
    <>
      <FilterGroup title="Availability">
        <label className="sl-eyebrow flex cursor-pointer items-center gap-2.5 font-sans text-sm">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => handleInStock(e.target.checked)}
            className="accent-[var(--sl-coral)]"
          />
          In stock ({inStockCount})
        </label>
      </FilterGroup>

      <FilterGroup title="Price">
        <div className="sl-eyebrow mb-2 flex justify-between font-sans text-xs">
          <span>$0</span>
          <span>{formatPrice(localPriceMax)}</span>
        </div>
        <input
          type="range"
          min={0}
          title="Maximum price"
          aria-label={`Maximum price, currently ${formatPrice(localPriceMax)}`}
          max={maxPrice || 1000}
          value={localPriceMax}
          onChange={(e) => setLocalPriceMax(Number(e.target.value))}
          onPointerUp={(e) =>
            commitPriceMax(Number((e.target as HTMLInputElement).value))
          }
          onKeyUp={() => commitPriceMax(localPriceMax)}
          className="sl-shop-range w-full"
        />
        {priceMax !== null && (
          <button
            type="button"
            onClick={() => commitPriceMax(maxPrice)}
            aria-label="Clear price filter"
            className="sl-eyebrow mt-2 font-sans text-xs tracking-[0.12em] uppercase underline transition-opacity hover:opacity-70"
          >
            Clear
          </button>
        )}
      </FilterGroup>

      {collections.length > 0 && (
        <FilterGroup title="Collections">
          <div className="flex flex-col gap-2.5">
            <Link
              href="/shop"
              className="font-sans text-sm font-medium tracking-[0.06em] text-[var(--sl-coral)] uppercase transition-opacity hover:opacity-70"
            >
              All pieces
            </Link>
            {collections.map((col) => (
              <Link
                key={col.id}
                href={`/collections/${col.slug}`}
                className="sl-eyebrow flex items-baseline justify-between font-sans text-sm transition-opacity hover:opacity-70"
              >
                <span>{col.name}</span>
                <span className="text-xs tracking-[0.1em]">{col.count}</span>
              </Link>
            ))}
          </div>
        </FilterGroup>
      )}
    </>
  );

  const productGrid = (
    <div>
      <div className="sl-shop-toolbar">
        <span className="sl-eyebrow hidden font-sans text-xs tracking-[0.14em] uppercase md:block">
          {filtered.length} {filtered.length === 1 ? "piece" : "pieces"}
        </span>
        <label className="sl-eyebrow ml-auto flex items-center gap-3 font-sans text-xs tracking-[0.14em] uppercase">
          Sort
          <select
            value={sortParam}
            onChange={(e) => handleSort(e.target.value as SortOption)}
            className="sl-shop-sort-select"
          >
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <FadeIn className="py-24 text-center">
          <p className="sl-eyebrow font-sans text-base">
            No pieces match your filters.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-6 font-sans text-xs tracking-[0.16em] text-[var(--sl-ink)] uppercase underline transition-opacity hover:opacity-70"
          >
            Clear filters
          </button>
        </FadeIn>
      ) : (
        <StaggerContainer
          key={filtered.map((p) => p.id).join(",")}
          className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-3"
          staggerDelay={0.07}
        >
          {filtered.map((product, index) => (
            <StaggerItem key={product.id}>
              <NoiseProductCard product={product} index={index} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </div>
  );

  return (
    <section className="mx-auto w-full max-w-7xl px-7 pt-2 pb-16 md:pb-20">
      {/* S-9: sr-only live region announcing filtered count — one region only (not on the duplicated visible spans) */}
      <span className="sr-only" role="status">
        {`${filtered.length} ${filtered.length === 1 ? "piece" : "pieces"} shown`}
      </span>
      <div className="sl-shop-toolbar mb-6 md:hidden">
        <span className="sl-eyebrow font-sans text-xs tracking-[0.14em] uppercase">
          {filtered.length} {filtered.length === 1 ? "piece" : "pieces"}
        </span>
        <button
          type="button"
          onClick={() => setMobileFiltersOpen((v) => !v)}
          className={cn(
            "sl-shop-filter-btn",
            mobileFiltersOpen && "sl-shop-filter-btn-active",
          )}
          aria-expanded={mobileFiltersOpen}
          aria-controls="sledge-shop-mobile-filters"
        >
          {mobileFiltersOpen ? (
            <>
              <X aria-hidden="true" className="h-3.5 w-3.5" />
              Close filters
            </>
          ) : (
            <>
              <SlidersHorizontal aria-hidden="true" className="h-3.5 w-3.5" />
              Filters
            </>
          )}
        </button>
      </div>

      {mobileFiltersOpen && (
        <div
          id="sledge-shop-mobile-filters"
          className="mb-8 border-b border-[var(--sl-border)] pb-6 md:hidden"
        >
          {filterPanel}
        </div>
      )}

      <div className="md:hidden">{productGrid}</div>

      <div className="hidden grid-cols-[220px_1fr] gap-12 md:grid lg:grid-cols-[240px_1fr] lg:gap-14">
        {/* M-7: label the aside landmark */}
        <aside aria-label="Product filters" className="pt-1">
          <p className="sl-eyebrow mb-6 font-sans text-xs tracking-[0.18em] uppercase">
            Filter by
          </p>
          {filterPanel}
        </aside>
        {productGrid}
      </div>
    </section>
  );
}
