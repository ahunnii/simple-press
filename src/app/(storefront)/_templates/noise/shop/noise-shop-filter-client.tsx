"use client";

import { useState } from "react";
import Link from "next/link";

import type { Product } from "~/types";
import { formatPrice } from "~/lib/prices";
import { useShopFilters } from "~/hooks/use-shop-filters";
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
        className="flex w-full items-center justify-between py-1"
      >
        <span
          className="font-mono text-[10px] tracking-[0.22em] uppercase"
          style={{ color: "var(--vn-ink)" }}
        >
          {title}
        </span>
        <span
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

  return (
    <section className="px-7 pt-10 pb-16">
      <div
        className="mx-auto grid gap-12"
        style={{
          maxWidth: "1440px",
          gridTemplateColumns: "240px 1fr",
        }}
      >
        {/* ── Filters sidebar ── */}
        <aside className="hidden pt-1 md:block">
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
              title="Price slider"
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
        </aside>

        {/* ── Product grid ── */}
        <div>
          {/* Sort + count bar */}
          <div
            className="mb-8 flex items-center justify-between border-b pb-5"
            style={{ borderColor: "var(--vn-rule)" }}
          >
            <span
              className="font-mono text-[11px] tracking-[0.14em] uppercase"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              {filtered.length} {filtered.length === 1 ? "piece" : "pieces"}
            </span>
            <label
              className="flex items-center gap-3 font-mono text-[11px] tracking-[0.14em] uppercase"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              Sort
              <select
                value={sortParam}
                onChange={(e) =>
                  handleSort(
                    e.target.value as Parameters<typeof handleSort>[0],
                  )
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
                <option value="featured">Featured</option>
                <option value="price-ascending">Price · Low to High</option>
                <option value="price-descending">Price · High to Low</option>
                <option value="title-ascending">Name A–Z</option>
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
      </div>
    </section>
  );
}
