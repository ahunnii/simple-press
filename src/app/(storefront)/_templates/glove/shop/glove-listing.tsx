"use client";

import { useEffect, useId, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { X } from "lucide-react";

import type { GloveBreadcrumbItem } from "../shared";
import type { SortOption } from "~/hooks/use-shop-filters";
import type { Product } from "~/types";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";
import { SORT_LABELS, useShopFilters } from "~/hooks/use-shop-filters";

import {
  GloveBreadcrumb,
  gloveButtonClass,
  GloveContainer,
  GloveProductGrid,
  GloveReveal,
  GloveSelect,
  GloveTitleBand,
} from "../shared";
import { GloveHandIcon } from "../shared/glove-hand-icon";

/** Cards per "page" (the live shop shows 12; LOAD MORE adds 12). */
const PAGE_SIZE = 12;

type Copy = {
  allLabel: string;
  resultsLabel: string;
  clearSearchLabel: string;
  loadMoreLabel: string;
  emptyHeading: string;
  emptyBody: string;
  emptyButtonLabel: string;
  emptyButtonHref: string;
  noResultsHeading: string;
  noResultsBody: string;
};

/** Field keys for live editor patching; omit any that aren't one field. */
type CopyKeys = Partial<Record<keyof Copy | "title" | "subtitle", string>>;

type Props = {
  products: Product[];
  title: string;
  subtitle?: string;
  /** Show the collection tabs in the band (the shop, not a collection). */
  showTabs: boolean;
  /** Category line for every card (a collection page); else the product's collections. */
  fixedCategory?: string;
  breadcrumb: GloveBreadcrumbItem[];
  copy: Copy;
  keys?: CopyKeys;
  bandSectionAttrs?: Record<string, string>;
  gridSectionAttrs?: Record<string, string>;
};

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Woo-style count: "Showing 1–12 of 17 results" / "Showing all 5 results". */
function resultsText(shown: number, total: number) {
  if (total === 0) return "No results";
  if (shown >= total) {
    return total === 1
      ? "Showing the single result"
      : `Showing all ${total} results`;
  }
  return `Showing 1–${shown} of ${total} results`;
}

/**
 * The shop listing, shared by ShopPage and CollectionPage (design.md Shop):
 * navy title band (with collection tabs on the shop), a toolbar (breadcrumb,
 * result count, sort), the 3-col product grid (2 on phones), and a crawlable
 * LOAD MORE PRODUCTS link (`?page=N`, B1.8 / P-PAGE-LINKS). Filtering,
 * sorting and paging all come from `useShopFilters`. A header search lands
 * here as `/shop?q=` and is synced into the filter (dark-trend pattern).
 */
export function GloveListing({
  products,
  title,
  subtitle,
  showTabs,
  fixedCategory,
  breadcrumb,
  copy,
  keys = {},
  bandSectionAttrs,
  gridSectionAttrs,
}: Props) {
  const {
    sortParam,
    handleSort,
    requestedPage,
    pageLinkProps,
    activeCollectionId,
    setActiveCollectionId,
    collections,
    filtered,
    search,
    setSearch,
    clearFilters,
  } = useShopFilters(products);
  const searchParams = useSearchParams();
  const sortId = useId();
  const fk = (k: keyof CopyKeys): Record<string, string> => {
    const key = keys[k];
    return key ? fieldAttr(key) : {};
  };

  // The header search pushes /shop?q=… — follow it even when already mounted.
  const qParam = searchParams.get("q") ?? "";
  useEffect(() => {
    if (qParam === search) return;
    setSearch(qParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qParam]);

  // Tab counts from the products already in hand (no second query).
  const tabs = useMemo(() => {
    if (!showTabs) return [];
    const allNorm = copy.allLabel.trim().toLowerCase();
    return collections
      .filter((c) => c.name.trim().toLowerCase() !== allNorm)
      .map((c) => ({
        ...c,
        count: products.filter((p) =>
          (p.collectionProducts ?? []).some((cp) => cp.collection.id === c.id),
        ).length,
      }))
      .filter((c) => c.count > 0);
  }, [showTabs, collections, products, copy.allLabel]);

  const visibleCount = requestedPage * PAGE_SIZE;
  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;
  const query = search.trim();
  const hasProducts = products.length > 0;

  const categoriesFor = (p: Product): string[] | undefined =>
    fixedCategory
      ? [fixedCategory]
      : (p.collectionProducts ?? []).map((cp) => cp.collection.name);

  return (
    <>
      <GloveTitleBand
        title={title}
        titleFieldKey={keys.title}
        subtitle={subtitle}
        subtitleFieldKey={keys.subtitle}
        sectionAttrs={bandSectionAttrs}
      >
        {tabs.length > 0 ? (
          <nav aria-label="Collections">
            <ul className="m-0 -mx-[var(--glove-gutter)] flex snap-x list-none gap-1 overflow-x-auto px-[var(--glove-gutter)] pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:justify-center md:overflow-visible md:px-0">
              {[
                { id: null, name: copy.allLabel, count: products.length },
                ...tabs,
              ].map((tab) => {
                const active = tab.id === activeCollectionId;
                return (
                  <li key={tab.id ?? "all"} className="shrink-0 snap-start">
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => setActiveCollectionId(tab.id)}
                      className="group flex min-h-11 flex-col items-center px-3 pt-1.5 text-[var(--glove-on-primary)]"
                    >
                      <span
                        className={cn(
                          "glove-display border-b-2 pb-0.5 text-[13px] font-medium tracking-wide whitespace-nowrap uppercase transition-colors duration-150",
                          active
                            ? "border-[var(--glove-on-primary)]"
                            : "border-transparent group-hover:border-[var(--glove-navy-soft)]",
                        )}
                        {...(tab.id === null ? fk("allLabel") : {})}
                      >
                        {tab.name}
                      </span>
                      <span className="mt-0.5 text-[12px] whitespace-nowrap text-[var(--glove-navy-soft)]">
                        {plural(tab.count, "Product", "Products")}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        ) : null}
      </GloveTitleBand>

      <section
        aria-label="Products"
        className="pt-6 pb-[var(--glove-section-pad-y)] md:pt-8"
        {...gridSectionAttrs}
      >
        <GloveContainer>
          <h2 className="sr-only">Products</h2>
          <div className="flex flex-col gap-4 border-b border-[var(--glove-line)] pb-4 md:flex-row md:items-center md:justify-between">
            <GloveBreadcrumb items={breadcrumb} />
            {hasProducts ? (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <p
                  className="m-0 text-[13px] text-[var(--glove-muted)]"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {resultsText(visible.length, filtered.length)}
                </p>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor={sortId}
                    className="glove-display text-[13px] font-medium text-[var(--glove-ink)]"
                  >
                    Sort by
                  </label>
                  <GloveSelect
                    id={sortId}
                    value={sortParam}
                    onChange={(e) => handleSort(e.target.value as SortOption)}
                    style={{
                      width: "auto",
                      minHeight: 40,
                      paddingBlock: 8,
                      fontSize: 14,
                    }}
                  >
                    {Object.entries(SORT_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </GloveSelect>
                </div>
              </div>
            ) : null}
          </div>

          {query ? (
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
              <p className="glove-display m-0 text-[18px] font-medium text-[var(--glove-ink)]">
                <span {...fk("resultsLabel")}>{copy.resultsLabel}</span>{" "}
                <span className="text-[var(--glove-primary)]">“{query}”</span>
              </p>
              <button
                type="button"
                onClick={() => setSearch("")}
                className="inline-flex min-h-11 items-center gap-1 text-[14px] font-bold text-[var(--glove-primary)] underline underline-offset-4"
              >
                <X className="size-4" aria-hidden="true" />
                <span {...fk("clearSearchLabel")}>{copy.clearSearchLabel}</span>
              </button>
            </div>
          ) : null}

          <div className="mt-8 md:mt-10">
            {visible.length === 0 ? (
              <GloveReveal>
                <EmptyState
                  heading={
                    hasProducts ? copy.noResultsHeading : copy.emptyHeading
                  }
                  body={hasProducts ? copy.noResultsBody : copy.emptyBody}
                  headingAttrs={fk(
                    hasProducts ? "noResultsHeading" : "emptyHeading",
                  )}
                  bodyAttrs={fk(hasProducts ? "noResultsBody" : "emptyBody")}
                >
                  {hasProducts ? (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className={gloveButtonClass({ variant: "woo" })}
                    >
                      {query ? copy.clearSearchLabel : copy.allLabel}
                    </button>
                  ) : copy.emptyButtonLabel && copy.emptyButtonHref ? (
                    <Link
                      href={copy.emptyButtonHref}
                      className={gloveButtonClass({ variant: "woo" })}
                      {...fk("emptyButtonLabel")}
                    >
                      {copy.emptyButtonLabel}
                    </Link>
                  ) : null}
                </EmptyState>
              </GloveReveal>
            ) : (
              <>
                <GloveProductGrid
                  products={visible}
                  categoriesFor={categoriesFor}
                />
                {hasMore ? (
                  <div className="mt-12 flex justify-center">
                    <a
                      {...pageLinkProps(requestedPage + 1, { scroll: false })}
                      className={gloveButtonClass({
                        variant: "outline",
                        className: "glove-btn--woo",
                      })}
                      {...fk("loadMoreLabel")}
                    >
                      {copy.loadMoreLabel}
                    </a>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </GloveContainer>
      </section>
    </>
  );
}

function EmptyState({
  heading,
  body,
  headingAttrs,
  bodyAttrs,
  children,
}: {
  heading: string;
  body: string;
  headingAttrs: Record<string, string>;
  bodyAttrs: Record<string, string>;
  children?: React.ReactNode;
}) {
  return (
    <div className="glove-mist-panel mx-auto flex max-w-2xl flex-col items-center gap-4 px-6 py-12 text-center md:py-16">
      <span className="inline-flex size-24 items-center justify-center rounded-full bg-[var(--glove-paper)] text-[var(--glove-primary)] shadow-[var(--glove-shadow-sm)]">
        <GloveHandIcon className="size-14" />
      </span>
      <h2
        className="glove-display m-0 text-[clamp(22px,2.6vw,28px)] font-medium text-[var(--glove-ink)]"
        {...headingAttrs}
      >
        {heading}
      </h2>
      {body ? (
        <p
          className="m-0 max-w-[52ch] text-[15px] leading-relaxed text-[var(--glove-text)]"
          {...bodyAttrs}
        >
          {body}
        </p>
      ) : null}
      {children ? <div className="mt-2">{children}</div> : null}
    </div>
  );
}
