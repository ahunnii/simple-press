"use client";

import { useState } from "react";
import Link from "next/link";
import { SlidersHorizontal, X } from "lucide-react";

import type { Product } from "~/types";
import { formatPrice } from "~/lib/prices";
import { SORT_LABELS, useShopFilters } from "~/hooks/use-shop-filters";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { NoiseProductCard } from "../shared/noise-product-card";

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
    <div
      className="mb-5 border-b pb-5"
      style={{ borderColor: "var(--vn-rule)" }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-1"
      >
        <span
          className="font-mono text-[10px] tracking-[0.22em] uppercase"
          style={{ color: "var(--vn-ink)" }}
        >
          {title}
        </span>
        <span
          aria-hidden="true"
          className="font-mono text-sm"
          style={{ color: "var(--vn-steel-mist)" }}
        >
          {open ? "−" : "+"}
        </span>
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function NoiseShopClient({ products, collections = [] }: Props) {
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
        <label
          className="flex cursor-pointer items-center gap-2.5 font-sans text-[13px]"
          style={{ color: "var(--vn-ink-soft)" }}
        >
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => handleInStock(e.target.checked)}
            className="accent-foreground"
            style={{ accentColor: "var(--vn-ink)" }}
          />
          In stock ({inStockCount})
        </label>
      </FilterGroup>

      <FilterGroup title="Price">
        <div
          className="mb-2 flex justify-between font-mono text-[11px]"
          style={{ color: "var(--vn-steel-mist)" }}
        >
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
          className="w-full"
          style={{ accentColor: "var(--vn-ink)" }}
        />
        {priceMax !== null && (
          <button
            type="button"
            onClick={() => commitPriceMax(maxPrice)}
            className="mt-2 font-mono text-[10px] tracking-[0.16em] uppercase underline"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            Clear
          </button>
        )}
      </FilterGroup>

      {collections.length > 0 && (
        <FilterGroup title="Collections">
          <div className="flex flex-col gap-2">
            <Link
              href="/shop"
              className="font-sans text-[13px] transition-colors"
              style={{ color: "var(--vn-ink)" }}
            >
              All pieces
            </Link>
            {collections.map((col) => (
              <Link
                key={col.id}
                href={`/collections/${col.slug}`}
                className="flex items-baseline justify-between font-sans text-[13px] transition-colors hover:opacity-70"
                style={{ color: "var(--vn-steel-mist)" }}
              >
                <span>{col.name}</span>
                <span className="font-mono text-[10px]">{col.count}</span>
              </Link>
            ))}
          </div>
        </FilterGroup>
      )}
    </>
  );

  const productGrid = (
    <div>
      {/* Sort + count bar */}
      <div
        className="mb-8 flex items-center justify-between border-b pb-5"
        style={{ borderColor: "var(--vn-rule)" }}
      >
        <span
          className="hidden font-mono text-[11px] tracking-[0.14em] uppercase md:block"
          style={{ color: "var(--vn-steel-mist)" }}
          aria-live="polite"
          aria-atomic="true"
        >
          {filtered.length} {filtered.length === 1 ? "piece" : "pieces"}
        </span>
        <label
          className="ml-auto flex items-center gap-3 font-mono text-[11px] tracking-[0.14em] uppercase"
          style={{ color: "var(--vn-steel-mist)" }}
        >
          Sort
          <select
            value={sortParam}
            onChange={(e) =>
              handleSort(e.target.value as keyof typeof SORT_LABELS)
            }
            className="cursor-pointer font-sans text-[13px] outline-none"
            style={{
              padding: "6px 10px",
              border: "1px solid var(--vn-rule)",
              background: "var(--vn-bone)",
              color: "var(--vn-ink)",
              fontFamily: "inherit",
            }}
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
          <p
            className="font-serif text-2xl font-light italic"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            No pieces match your filters.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-6 font-mono text-[11px] tracking-[0.2em] uppercase underline"
            style={{ color: "var(--vn-ink)" }}
          >
            Clear filters
          </button>
        </FadeIn>
      ) : (
        <StaggerContainer
          key={filtered.map((p) => p.id).join(",")}
          className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3"
          staggerDelay={0.06}
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
    <section className="px-5 pt-10 pb-16 sm:px-7">
      {/* Mobile filter toggle */}
      <div
        className="mb-6 flex items-center justify-between md:hidden"
        style={{
          borderBottom: "1px solid var(--vn-rule)",
          paddingBottom: "12px",
        }}
      >
        <span
          className="font-mono text-[11px] tracking-[0.14em] uppercase"
          style={{ color: "var(--vn-steel-mist)" }}
          aria-live="polite"
          aria-atomic="true"
        >
          {filtered.length} {filtered.length === 1 ? "piece" : "pieces"}
        </span>
        <button
          type="button"
          onClick={() => setMobileFiltersOpen((v) => !v)}
          className="flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] uppercase transition-opacity hover:opacity-70"
          style={{
            border: "1px solid var(--vn-ink)",
            padding: "6px 12px",
            color: "var(--vn-ink)",
          }}
          aria-expanded={mobileFiltersOpen}
          aria-controls="noise-mobile-filters"
          aria-label={(() => {
            const activeCount = (inStockOnly ? 1 : 0) + (priceMax !== null ? 1 : 0);
            return activeCount > 0 ? `Filters, ${activeCount} active` : "Filters";
          })()}
        >
          {mobileFiltersOpen ? (
            <>
              <X className="h-3.5 w-3.5" />
              Close filters
            </>
          ) : (
            <>
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
            </>
          )}
        </button>
      </div>

      {/* Mobile filter panel (collapsed by default) */}
      {mobileFiltersOpen && (
        <div
          id="noise-mobile-filters"
          className="mb-8 border-b pb-6 md:hidden"
          style={{ borderColor: "var(--vn-rule)" }}
        >
          {filterPanel}
        </div>
      )}

      {/* Mobile: product grid only (no sidebar) */}
      <div className="md:hidden">{productGrid}</div>

      {/* Desktop: 2-column sidebar + grid */}
      <div
        className="mx-auto hidden md:grid"
        style={{
          maxWidth: "1440px",
          gridTemplateColumns: "240px 1fr",
          gap: "48px",
        }}
      >
        {/* ── Filters sidebar ── */}
        <aside className="pt-1" aria-label="Product filters">{filterPanel}</aside>

        {/* ── Product grid ── */}
        {productGrid}
      </div>
    </section>
  );
}
