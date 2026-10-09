"use client";

import { useEffect, useId, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { X } from "lucide-react";

import type { GloveBreadcrumbItem } from "../shared";
import type { SortOption } from "~/hooks/use-shop-filters";
import type { Product } from "~/types";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { SORT_LABELS, useShopFilters } from "~/hooks/use-shop-filters";

import {
  gloveButtonClass,
  GloveContainer,
  GloveProductGrid,
  GloveReveal,
  GloveSelect,
  GloveTitleBand,
} from "../shared";
import { GloveHandIcon } from "../shared/glove-hand-icon";
import { GloveCollectionTabs } from "./glove-collection-tabs";

/** Cards per "page" (the live shop shows 12; Load more adds 12). */
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
  /** Show the collection tabs strip under the band (the shop, not a collection). */
  showTabs: boolean;
  breadcrumb: GloveBreadcrumbItem[];
  copy: Copy;
  keys?: CopyKeys;
  bandSectionAttrs?: Record<string, string>;
  gridSectionAttrs?: Record<string, string>;
};

/** Sentence-case the shared sort labels ("Price, Low to High" -> "Price, low to high"). */
function sortLabel(label: string) {
  const clean = label.replace(/\s+/g, " ").trim();
  return /^[A-Z] → [A-Z]$/.test(clean)
    ? clean
    : clean.charAt(0) + clean.slice(1).toLowerCase();
}

/** Quiet count of the filtered set: "31 pieces" / "1 piece". */
function resultsText(total: number) {
  if (total === 0) return "No pieces";
  return total === 1 ? "1 piece" : `${total} pieces`;
}

/**
 * The shop listing, shared by ShopPage and CollectionPage (design.md Shop):
 * banner title band (breadcrumb inside), a collection tabs strip on the shop,
 * a toolbar (result count, sort), the 3-col product grid (2 on phones), and a crawlable
 * load-more link (`?page=N`, B1.8 / P-PAGE-LINKS). Filtering,
 * sorting and paging all come from `useShopFilters`. A header search lands
 * here as `/shop?q=` and is synced into the filter (dark-trend pattern).
 */
export function GloveListing({
  products,
  title,
  subtitle,
  showTabs,
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

  // Collections with at least one product here (no second query).
  const tabs = useMemo(() => {
    if (!showTabs) return [];
    const allNorm = copy.allLabel.trim().toLowerCase();
    return collections
      .filter((c) => c.name.trim().toLowerCase() !== allNorm)
      .filter((c) =>
        products.some((p) =>
          (p.collectionProducts ?? []).some((cp) => cp.collection.id === c.id),
        ),
      )
      .map((c) => ({ id: c.id, name: c.name }));
  }, [showTabs, collections, products, copy.allLabel]);

  const visibleCount = requestedPage * PAGE_SIZE;
  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;
  const query = search.trim();
  const hasProducts = products.length > 0;

  return (
    <>
      <GloveTitleBand
        variant="banner"
        title={title}
        titleFieldKey={keys.title}
        subtitle={subtitle}
        subtitleFieldKey={keys.subtitle}
        breadcrumb={breadcrumb}
        sectionAttrs={bandSectionAttrs}
      />
      {tabs.length > 0 ? (
        <GloveCollectionTabs
          tabs={[{ id: null, name: copy.allLabel }, ...tabs]}
          activeId={activeCollectionId}
          onSelect={setActiveCollectionId}
          allLabelAttrs={fk("allLabel")}
        />
      ) : null}

      <section
        aria-label="Products"
        className="pt-6 pb-[var(--glove-section-pad-y)] md:pt-8"
        {...gridSectionAttrs}
      >
        <GloveContainer>
          <h2 className="sr-only">Products</h2>
          {query ? (
            <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
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

          {hasProducts ? (
            <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-b border-[var(--glove-line)] pb-4">
              <p
                className="m-0 text-[13px] text-[var(--glove-muted)]"
                aria-live="polite"
                aria-atomic="true"
              >
                {resultsText(filtered.length)}
              </p>
              <div className="flex items-center gap-2">
                <label
                  htmlFor={sortId}
                  className="glove-display text-[13px] font-medium text-[var(--glove-muted)]"
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
                      {sortLabel(label)}
                    </option>
                  ))}
                </GloveSelect>
              </div>
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
                <GloveProductGrid products={visible} />
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
