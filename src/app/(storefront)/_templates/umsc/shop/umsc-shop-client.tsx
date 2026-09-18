"use client";

import type { Product } from "~/types";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";
import { SORT_LABELS, useShopFilters } from "~/hooks/use-shop-filters";

import { UmscButton } from "../shared/umsc-button";
import { UmscImageFallback } from "../shared/umsc-image-fallback";
import { UmscProductGrid } from "../shared/umsc-product-grid";
import { UmscRevealGroup } from "../shared/umsc-reveal";
import { UmscSection } from "../shared/umsc-section";

type Props = {
  products: Product[];
  sectionAttrs?: Record<string, string>;
  emptyHeading: string;
  emptyHeadingFieldKey?: string;
  emptyBody: string;
  emptyBodyFieldKey?: string;
  emptyLinkLabel: string;
  emptyLinkLabelFieldKey?: string;
};

/**
 * UmscShopClient — design.md "Shop → Grid". Toolbar (type chips, product
 * count, in-stock filter, gold-ink sort caret) + `UmscProductGrid` +
 * windowed pagination, all driven by the shared `useShopFilters` hook.
 */
export function UmscShopClient({
  products,
  sectionAttrs,
  emptyHeading,
  emptyHeadingFieldKey,
  emptyBody,
  emptyBodyFieldKey,
  emptyLinkLabel,
  emptyLinkLabelFieldKey,
}: Props) {
  const {
    sortParam,
    handleSort,
    currentPage,
    totalPages,
    handlePage,
    inStockOnly,
    handleInStock,
    collections,
    activeCollectionId,
    setActiveCollectionId,
    filtered,
    paginated,
  } = useShopFilters(products, { pageSize: 12 });

  if (products.length === 0) {
    return (
      <UmscSection tone="paper" aria-label="Shop" sectionAttrs={sectionAttrs}>
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="grid w-full max-w-[680px] grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <UmscImageFallback key={i} aspect="1 / 1" />
            ))}
          </div>
          <h2
            {...(emptyHeadingFieldKey ? fieldAttr(emptyHeadingFieldKey) : {})}
            className="umsc-serif text-[24px] text-[var(--umsc-ink)]"
          >
            {emptyHeading}
          </h2>
          {emptyBody && (
            <p
              {...(emptyBodyFieldKey ? fieldAttr(emptyBodyFieldKey) : {})}
              className="umsc-sans max-w-[46ch] text-[15px] text-[var(--umsc-muted)]"
            >
              {emptyBody}
            </p>
          )}
          <UmscButton
            href="/contact"
            variant="link"
            fieldKey={emptyLinkLabelFieldKey}
          >
            {emptyLinkLabel}
          </UmscButton>
        </div>
      </UmscSection>
    );
  }

  return (
    <UmscSection tone="paper" aria-label="Shop" sectionAttrs={sectionAttrs}>
      {/* Toolbar */}
      <div className="flex flex-col gap-5 border-b border-[var(--umsc-line)] pb-6">
        {collections.length > 0 && (
          <div
            role="group"
            aria-label="Filter by product type"
            className="flex flex-wrap gap-2"
          >
            <button
              type="button"
              onClick={() => setActiveCollectionId(null)}
              aria-pressed={activeCollectionId === null}
              className={cn(
                "umsc-sans inline-flex h-11 items-center rounded-[var(--umsc-radius-pill)] border px-4 text-[12px] font-medium tracking-[0.06em] uppercase transition-colors",
                activeCollectionId === null
                  ? "border-[var(--umsc-ink)] bg-[var(--umsc-ink)] text-[var(--umsc-paper)]"
                  : "border-[var(--umsc-line)] bg-transparent text-[var(--umsc-muted)] hover:border-[var(--umsc-ink)] hover:text-[var(--umsc-ink)]",
              )}
            >
              All
            </button>
            {collections.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() =>
                  setActiveCollectionId(
                    c.id === activeCollectionId ? null : c.id,
                  )
                }
                aria-pressed={activeCollectionId === c.id}
                className={cn(
                  "umsc-sans inline-flex h-11 items-center rounded-[var(--umsc-radius-pill)] border px-4 text-[12px] font-medium tracking-[0.06em] uppercase transition-colors",
                  activeCollectionId === c.id
                    ? "border-[var(--umsc-ink)] bg-[var(--umsc-ink)] text-[var(--umsc-paper)]"
                    : "border-[var(--umsc-line)] bg-transparent text-[var(--umsc-muted)] hover:border-[var(--umsc-ink)] hover:text-[var(--umsc-ink)]",
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <span
            aria-live="polite"
            aria-atomic="true"
            className="umsc-sans text-[12px] tracking-[0.1em] text-[var(--umsc-muted)] uppercase"
          >
            {filtered.length} product{filtered.length !== 1 ? "s" : ""}
          </span>

          <div className="flex items-center gap-6">
            <label className="umsc-sans inline-flex cursor-pointer items-center gap-2 text-[13px] text-[var(--umsc-ink)]">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => handleInStock(e.target.checked)}
                className="size-[15px] accent-[var(--umsc-gold-ink)]"
              />
              In stock only
            </label>

            <label className="umsc-sans inline-flex items-center gap-2 text-[13px] text-[var(--umsc-muted)]">
              Sort
              <select
                aria-label="Sort products"
                value={sortParam}
                onChange={(e) =>
                  handleSort(e.target.value as keyof typeof SORT_LABELS)
                }
                className="umsc-sans h-11 cursor-pointer appearance-none border border-[var(--umsc-line)] bg-[var(--umsc-paper)] px-3 pr-8 text-[13px] text-[var(--umsc-ink)]"
                style={{
                  backgroundImage:
                    "linear-gradient(45deg,transparent 50%,var(--umsc-gold-ink) 50%),linear-gradient(135deg,var(--umsc-gold-ink) 50%,transparent 50%)",
                  backgroundPosition:
                    "calc(100% - 15px) center, calc(100% - 11px) center",
                  backgroundSize: "4px 4px",
                  backgroundRepeat: "no-repeat",
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
        </div>
      </div>

      {/* Grid */}
      <div className="pt-8">
        {paginated.length === 0 ? (
          <p className="umsc-sans py-16 text-center text-[15px] text-[var(--umsc-muted)]">
            No products match your filters.
          </p>
        ) : (
          <UmscRevealGroup>
            <UmscProductGrid products={paginated} />
          </UmscRevealGroup>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="mt-12 flex items-center justify-center gap-2"
        >
          <UmscPageButton
            onClick={() => handlePage(currentPage - 1)}
            disabled={currentPage === 1}
            wide
          >
            Previous
          </UmscPageButton>
          {buildPageList(currentPage, totalPages).map((p, i) =>
            p === "ellipsis" ? (
              <span
                key={`ellipsis-${i}`}
                aria-hidden="true"
                className="umsc-sans flex h-11 min-w-11 items-center justify-center text-[13px] text-[var(--umsc-muted)]"
              >
                …
              </span>
            ) : (
              <UmscPageButton
                key={p}
                onClick={() => handlePage(p)}
                active={p === currentPage}
                ariaLabel={`Page ${p}`}
                ariaCurrent={p === currentPage}
              >
                {p}
              </UmscPageButton>
            ),
          )}
          <UmscPageButton
            onClick={() => handlePage(currentPage + 1)}
            disabled={currentPage === totalPages}
            wide
          >
            Next
          </UmscPageButton>
        </nav>
      )}
    </UmscSection>
  );
}

function buildPageList(
  currentPage: number,
  totalPages: number,
): (number | "ellipsis")[] {
  const pages: (number | "ellipsis")[] = [];
  const delta = 1;
  const rangeStart = Math.max(2, currentPage - delta);
  const rangeEnd = Math.min(totalPages - 1, currentPage + delta);

  pages.push(1);
  if (rangeStart > 2) pages.push("ellipsis");
  for (let p = rangeStart; p <= rangeEnd; p++) pages.push(p);
  if (rangeEnd < totalPages - 1) pages.push("ellipsis");
  if (totalPages > 1) pages.push(totalPages);

  return pages;
}

function UmscPageButton({
  children,
  onClick,
  disabled,
  active,
  wide,
  ariaLabel,
  ariaCurrent,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  wide?: boolean;
  ariaLabel?: string;
  ariaCurrent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-current={ariaCurrent ? "page" : undefined}
      className={cn(
        "umsc-sans flex h-11 items-center justify-center border text-[13px] transition-colors",
        wide ? "min-w-11 px-4" : "min-w-11",
        active
          ? "border-[var(--umsc-ink)] bg-[var(--umsc-ink)] text-[var(--umsc-paper)]"
          : "border-[var(--umsc-line)] bg-transparent text-[var(--umsc-ink)]",
        disabled && "cursor-default opacity-30",
        !disabled && !active && "cursor-pointer hover:border-[var(--umsc-ink)]",
      )}
    >
      {children}
    </button>
  );
}
