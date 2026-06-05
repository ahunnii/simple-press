"use client";

import { useState } from "react";
import Link from "next/link";
import { SlidersHorizontal, X } from "lucide-react";

import type { SortOption } from "~/hooks/use-shop-filters";
import type { Product } from "~/types";
import { formatPrice } from "~/lib/prices";
import { SORT_LABELS, useShopFilters } from "~/hooks/use-shop-filters";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { NoiseProductCard } from "../shared/sledge-product-card";

type Props = {
  products: Product[];
  backHref?: string;
  backLabel?: string;
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
    <div className="mb-5 border-b pb-5" style={{ borderColor: "#e8e8e8" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-1"
      >
        <span
          className="font-sans text-xs font-medium tracking-[0.18em] uppercase"
          style={{ color: "var(--sl-ink)" }}
        >
          {title}
        </span>
        <span
          aria-hidden="true"
          className="font-sans text-sm"
          style={{ color: "var(--sl-ink-soft)" }}
        >
          {open ? "−" : "+"}
        </span>
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function NoiseCollectionClient({
  products,
  backHref = "/collections",
  backLabel = "All Collections",
}: Props) {
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
      <Link
        href={backHref}
        className="mb-6 block font-sans text-xs tracking-[0.16em] uppercase transition-opacity hover:opacity-60 md:hidden"
        style={{ color: "var(--sl-ink-soft)" }}
      >
        ← {backLabel}
      </Link>

      <FilterGroup title="Availability">
        <label
          className="flex cursor-pointer items-center gap-2.5 font-sans text-sm"
          style={{ color: "var(--sl-ink-soft)" }}
        >
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => handleInStock(e.target.checked)}
            style={{ accentColor: "var(--sl-coral)" }}
          />
          In stock ({inStockCount})
        </label>
      </FilterGroup>

      <FilterGroup title="Price">
        <div
          className="mb-2 flex justify-between font-sans text-xs"
          style={{ color: "var(--sl-ink-soft)" }}
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
          style={{ accentColor: "var(--sl-coral)" }}
        />
        {priceMax !== null && (
          <button
            type="button"
            onClick={() => commitPriceMax(maxPrice)}
            className="mt-2 font-sans text-xs tracking-[0.12em] uppercase underline"
            style={{ color: "var(--sl-ink-soft)" }}
          >
            Clear
          </button>
        )}
      </FilterGroup>
    </>
  );

  const productGrid = (
    <div>
      <div
        className="mb-8 flex items-center justify-between border-b pb-5"
        style={{ borderColor: "#e8e8e8" }}
      >
        <span
          className="hidden font-sans text-xs tracking-[0.14em] uppercase md:block"
          style={{ color: "var(--sl-ink-soft)" }}
        >
          {filtered.length} {filtered.length === 1 ? "piece" : "pieces"}
        </span>
        <label
          className="ml-auto flex items-center gap-3 font-sans text-xs tracking-[0.14em] uppercase"
          style={{ color: "var(--sl-ink-soft)" }}
        >
          Sort
          <select
            value={sortParam}
            onChange={(e) => handleSort(e.target.value as SortOption)}
            className="cursor-pointer rounded-sm font-sans text-sm outline-none"
            style={{
              padding: "6px 10px",
              border: "1px solid var(--sl-ink)",
              color: "var(--sl-ink)",
              fontFamily: "inherit",
              background: "#ffffff",
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
            className="font-sans text-base"
            style={{ color: "var(--sl-ink-soft)" }}
          >
            No pieces match your filters.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-6 font-sans text-xs tracking-[0.16em] uppercase underline"
            style={{ color: "var(--sl-ink)" }}
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
    <section className="mx-auto max-w-7xl px-5 pt-2 pb-16 sm:px-7">
      <div
        className="mb-6 flex items-center justify-between md:hidden"
        style={{
          borderBottom: "1px solid #e8e8e8",
          paddingBottom: "12px",
        }}
      >
        <span
          className="font-sans text-xs tracking-[0.14em] uppercase"
          style={{ color: "var(--sl-ink-soft)" }}
        >
          {filtered.length} {filtered.length === 1 ? "piece" : "pieces"}
        </span>
        <button
          type="button"
          onClick={() => setMobileFiltersOpen((v) => !v)}
          className="flex items-center gap-2 font-sans text-[10px] tracking-[0.18em] uppercase transition-opacity hover:opacity-70"
          style={{
            border: "1px solid var(--sl-ink)",
            padding: "6px 12px",
            color: "var(--sl-ink)",
          }}
          aria-expanded={mobileFiltersOpen}
          aria-controls="sledge-collection-mobile-filters"
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

      {mobileFiltersOpen && (
        <div
          id="sledge-collection-mobile-filters"
          className="mb-8 border-b pb-6 md:hidden"
          style={{ borderColor: "#e8e8e8" }}
        >
          {filterPanel}
        </div>
      )}

      <div className="md:hidden">{productGrid}</div>

      <div
        className="mx-auto hidden md:grid"
        style={{
          maxWidth: "1440px",
          gridTemplateColumns: "240px 1fr",
          gap: "48px",
        }}
      >
        <aside className="pt-1">
          <Link
            href={backHref}
            className="mb-6 block font-sans text-xs tracking-[0.16em] uppercase transition-opacity hover:opacity-60"
            style={{ color: "var(--sl-ink-soft)" }}
          >
            ← {backLabel}
          </Link>
          {filterPanel}
        </aside>
        {productGrid}
      </div>
    </section>
  );
}
