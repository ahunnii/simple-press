"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { SortOption } from "~/hooks/use-shop-sort";
import type { Product } from "~/types";
import { formatPrice, getEffectivePrice } from "~/lib/prices";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { NoiseProductCard } from "../shared/noise-product-card";

const NOISE_SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "featured", label: "Featured" },
  { value: "price-ascending", label: "Price · Low to High" },
  { value: "price-descending", label: "Price · High to Low" },
  { value: "title-ascending", label: "Name A–Z" },
];

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

function isInStock(p: Product): boolean {
  if (!p.trackInventory) return true;
  if (p.allowBackorders) return true;
  if (p.baseInventoryUnit) {
    return (
      p.baseInventoryUnit.allowBackorders ||
      p.baseInventoryUnit.inventoryQty > 0
    );
  }
  if (p.variants.length > 0) {
    return p.variants.some((v) => v.inventoryQty > 0);
  }
  return (p.inventoryQty ?? 0) > 0;
}

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sort = (searchParams.get("sort_by") ?? "featured") as SortOption;
  const priceMaxParam = searchParams.get("price_max");
  const priceMax = priceMaxParam !== null ? Number(priceMaxParam) : null;
  const inStockOnly = searchParams.get("in_stock") === "1";

  const maxPrice = useMemo(
    () => Math.max(...products.map((p) => p.price ?? 0), 0),
    [products],
  );

  // Local state drives the slider thumb and price label instantly while dragging.
  // The URL (and filtered list) only updates on pointer/key release.
  const [localPriceMax, setLocalPriceMax] = useState<number>(
    () => priceMax ?? maxPrice,
  );

  useEffect(() => {
    setLocalPriceMax(priceMax ?? maxPrice);
  }, [priceMax, maxPrice]);

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    const qs = params.toString();
    router.replace(pathname + (qs ? "?" + qs : ""), { scroll: false });
  }

  const sorted = useMemo(() => {
    let list = [...products];
    if (inStockOnly) list = list.filter(isInStock);
    if (priceMax !== null)
      list = list.filter((p) => (p.price ?? 0) <= priceMax);
    switch (sort) {
      case "price-ascending":
        list.sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
        break;
      case "price-descending":
        list.sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));
        break;
      case "title-ascending":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "title-descending":
        list.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "newest":
        list.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        break;
    }
    return list;
  }, [products, sort, priceMax, inStockOnly]);

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
                onChange={(e) =>
                  updateParams({ in_stock: e.target.checked ? "1" : null })
                }
                className="accent-foreground"
                style={{ accentColor: "var(--vn-ink)" }}
              />
              In stock ({products.filter(isInStock).length})
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
              onPointerUp={(e) => {
                const v = Number((e.target as HTMLInputElement).value);
                updateParams({ price_max: v >= maxPrice ? null : String(v) });
              }}
              onKeyUp={() => {
                updateParams({
                  price_max:
                    localPriceMax >= maxPrice ? null : String(localPriceMax),
                });
              }}
              className="w-full"
              style={{ accentColor: "var(--vn-ink)" }}
            />
            {priceMax !== null && (
              <button
                type="button"
                onClick={() => updateParams({ price_max: null })}
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
              {sorted.length} {sorted.length === 1 ? "piece" : "pieces"}
            </span>
            <label
              className="flex items-center gap-3 font-mono text-[11px] tracking-[0.14em] uppercase"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              Sort
              <select
                value={sort}
                onChange={(e) =>
                  updateParams({
                    sort_by:
                      e.target.value === "featured" ? null : e.target.value,
                  })
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
                {NOISE_SORT_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
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
                type="button"
                onClick={() =>
                  updateParams({ price_max: null, in_stock: null })
                }
                className="mt-6 font-mono text-[11px] tracking-[0.2em] uppercase underline"
                style={{ color: "var(--vn-ink)" }}
              >
                Clear filters
              </button>
            </FadeIn>
          ) : (
            <StaggerContainer
              key={sorted.map((p) => p.id).join(",")}
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
