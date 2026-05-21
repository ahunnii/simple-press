"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import type { Product } from "~/types";
import { formatPrice } from "~/lib/prices";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { NoiseProductCard } from "../shared/noise-product-card";

type SortKey = "featured" | "price-asc" | "price-desc" | "name";

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
    <div
      className="mb-5 border-b pb-5"
      style={{ borderColor: "var(--vn-rule)" }}
    >
      <button
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

export function NoiseCollectionClient({
  products,
  backHref = "/collections",
  backLabel = "All Collections",
}: Props) {
  const [sort, setSort] = useState<SortKey>("featured");
  const [priceMax, setPriceMax] = useState<number | null>(null);
  const [inStockOnly, setInStockOnly] = useState(false);

  const maxPrice = useMemo(
    () => Math.max(...products.map((p) => p.price ?? 0), 0),
    [products],
  );

  const sorted = useMemo(() => {
    let list = [...products];
    if (inStockOnly) {
      list = list.filter(
        (p) =>
          !p.trackInventory || (p.inventoryQty ?? 0) > 0 || p.allowBackorders,
      );
    }
    if (priceMax !== null)
      list = list.filter((p) => (p.price ?? 0) <= priceMax);
    if (sort === "price-asc")
      list.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    if (sort === "price-desc")
      list.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    if (sort === "name")
      list.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    return list;
  }, [products, sort, priceMax, inStockOnly]);

  const effectiveMax = priceMax ?? maxPrice;

  return (
    <section className="px-7 pt-10 pb-16">
      <div
        className="mx-auto grid gap-12"
        style={{ maxWidth: "1440px", gridTemplateColumns: "240px 1fr" }}
      >
        {/* ── Filters sidebar ── */}
        <aside className="hidden pt-1 md:block">
          <Link
            href={backHref}
            className="mb-6 block font-mono text-[10px] tracking-[0.18em] uppercase transition-opacity hover:opacity-60"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            ← {backLabel}
          </Link>

          <FilterGroup title="Availability">
            <label
              className="flex cursor-pointer items-center gap-2.5 font-sans text-[13px]"
              style={{ color: "var(--vn-ink-soft)" }}
            >
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                style={{ accentColor: "var(--vn-ink)" }}
              />
              In stock (
              {
                products.filter(
                  (p) =>
                    !p.trackInventory ||
                    (p.inventoryQty ?? 0) > 0 ||
                    p.allowBackorders,
                ).length
              }
              )
            </label>
          </FilterGroup>

          <FilterGroup title="Price">
            <div
              className="mb-2 flex justify-between font-mono text-[11px]"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              <span>$0</span>
              <span>{formatPrice(effectiveMax)}</span>
            </div>
            <input
              type="range"
              min={0}
              title="Price slider"
              max={maxPrice || 1000}
              value={effectiveMax}
              onChange={(e) => setPriceMax(Number(e.target.value))}
              className="w-full"
              style={{ accentColor: "var(--vn-ink)" }}
            />
            {priceMax !== null && (
              <button
                onClick={() => setPriceMax(null)}
                className="mt-2 font-mono text-[10px] tracking-[0.16em] uppercase underline"
                style={{ color: "var(--vn-steel-mist)" }}
              >
                Clear
              </button>
            )}
          </FilterGroup>
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
              {sorted.length} {sorted.length === 1 ? "piece" : "pieces"}
            </span>
            <label
              className="flex items-center gap-3 font-mono text-[11px] tracking-[0.14em] uppercase"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              Sort
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
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
                <option value="price-asc">Price · Low to High</option>
                <option value="price-desc">Price · High to Low</option>
                <option value="name">Name A–Z</option>
              </select>
            </label>
          </div>

          {sorted.length === 0 ? (
            <FadeIn className="py-24 text-center">
              <p
                className="font-serif text-2xl font-light italic"
                style={{ color: "var(--vn-steel-mist)" }}
              >
                No pieces match your filters.
              </p>
              <button
                onClick={() => {
                  setPriceMax(null);
                  setInStockOnly(false);
                }}
                className="mt-6 font-mono text-[11px] tracking-[0.2em] uppercase underline"
                style={{ color: "var(--vn-ink)" }}
              >
                Clear filters
              </button>
            </FadeIn>
          ) : (
            <StaggerContainer
              className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3"
              staggerDelay={0.06}
            >
              {sorted.map((product, index) => (
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
