"use client";

import type { CSSProperties, KeyboardEvent } from "react";
import { useId, useRef } from "react";

import type { SortOption } from "~/hooks/use-shop-filters";
import type { Product } from "~/types";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";
import { SORT_LABELS, useShopFilters } from "~/hooks/use-shop-filters";

import {
  OliveButton,
  OliveChip,
  OliveEmptyState,
  OliveProductGrid,
  OliveSelect,
} from "../shared";
import { oliveChipToken } from "../shared/olive-color";

/** Cards per page. Four columns × six rows on a desktop grid. */
const PAGE_SIZE = 24;

type Props = {
  products: Product[];
  heading: string;
  body: string;
  emptyHeading: string;
  emptyBody: string;
  noResultsHeading: string;
  noResultsBody: string;
  sectionAttrs?: Record<string, string>;
  headingFieldKey?: string;
  bodyFieldKey?: string;
};

/**
 * OliveShopClient — the shop's own half of the page.
 *
 * The toolbar pins under the header (`--olive-header-h`) so the collection
 * tabs, the stock switch and the sort stay readable however far down a long
 * grid the shopper is. Everything it controls comes from `useShopFilters`;
 * nothing about filtering, sorting or paging is re-implemented here.
 *
 * The empty result is answered twice, differently: a store with nothing
 * published gets the owner's own line, a filter that matched nothing gets a
 * way back out. A blank grid is never the answer.
 */
export function OliveShopClient({
  products,
  heading,
  body,
  emptyHeading,
  emptyBody,
  noResultsHeading,
  noResultsBody,
  sectionAttrs,
  headingFieldKey,
  bodyFieldKey,
}: Props) {
  const {
    sortParam,
    handleSort,
    currentPage,
    totalPages,
    handlePage,
    inStockOnly,
    handleInStock,
    activeCollectionId,
    setActiveCollectionId,
    collections,
    filtered,
    paginated,
    hasActiveFilters,
    clearFilters,
  } = useShopFilters(products, { pageSize: PAGE_SIZE });

  const sortId = useId();
  const stockId = useId();

  const count = filtered.length;
  const hasProducts = products.length > 0;

  return (
    <section
      aria-labelledby="olive-shop-heading"
      style={{ backgroundColor: "var(--olive-white)" }}
      {...sectionAttrs}
    >
      {/* Title block — heading plus one line, and nothing else above it. */}
      <div style={containerStyle} className="pt-10 pb-6 md:pt-14 md:pb-8">
        <div className="flex flex-col gap-3">
          <h1
            id="olive-shop-heading"
            className="olive-h1"
            {...(headingFieldKey ? fieldAttr(headingFieldKey) : {})}
          >
            {heading}
          </h1>
          {body ? (
            <p
              className="max-w-[58ch] text-[0.9375rem] leading-relaxed"
              style={{ color: "var(--olive-ink-soft)" }}
              {...(bodyFieldKey ? fieldAttr(bodyFieldKey) : {})}
            >
              {body}
            </p>
          ) : null}
        </div>
      </div>

      {/* Sticky toolbar — white card stock, one hairline, pinned under the header. */}
      {hasProducts ? (
        <div
          className="sticky z-20"
          style={{
            top: "var(--olive-header-h)",
            backgroundColor: "var(--olive-white)",
            borderTop: "1px solid var(--olive-hairline)",
            borderBottom: "1px solid var(--olive-hairline)",
          }}
        >
          <div style={containerStyle} className="flex flex-col gap-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
              <p
                className="olive-label"
                aria-live="polite"
                aria-atomic="true"
                style={{ color: "var(--olive-ink)" }}
              >
                {count} {count === 1 ? "item" : "items"}
              </p>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                <span className="inline-flex items-center gap-2">
                  <input
                    id={stockId}
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(event) => handleInStock(event.target.checked)}
                    style={{
                      width: "1rem",
                      height: "1rem",
                      accentColor: "var(--olive-sage)",
                      cursor: "pointer",
                    }}
                  />
                  <label
                    htmlFor={stockId}
                    className="olive-caption cursor-pointer"
                    style={{ color: "var(--olive-ink)" }}
                  >
                    In stock only
                  </label>
                </span>

                <span className="inline-flex items-center gap-2">
                  <label htmlFor={sortId} className="olive-label">
                    Sort
                  </label>
                  <OliveSelect
                    id={sortId}
                    value={sortParam}
                    onChange={(event) =>
                      handleSort(event.target.value as SortOption)
                    }
                    // Width is set inline on purpose: the scoped
                    // `.olive .olive-select` rule is unlayered and would beat a
                    // Tailwind width utility.
                    style={{ width: "auto", paddingBlock: "0.4375rem" }}
                  >
                    {Object.entries(SORT_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </OliveSelect>
                </span>
              </div>
            </div>

            {collections.length > 0 ? (
              <OliveCollectionTabs
                collections={collections}
                activeId={activeCollectionId}
                onChange={setActiveCollectionId}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {/* The swatch grid */}
      <div style={containerStyle} className="pt-8 pb-16 md:pt-10 md:pb-24">
        {count === 0 ? (
          <OliveEmptyState
            headingAs="h2"
            heading={hasProducts ? noResultsHeading : emptyHeading}
            body={hasProducts ? noResultsBody : emptyBody}
            cta={
              hasProducts ? undefined : { label: "Say hello", href: "/contact" }
            }
          >
            {hasProducts && hasActiveFilters ? (
              <OliveButton
                variant="secondary"
                onClick={clearFilters}
                className="mt-1"
              >
                Clear filters
              </OliveButton>
            ) : null}
          </OliveEmptyState>
        ) : (
          <>
            <OliveProductGrid
              headingLevel={2}
              products={paginated}
              columns={4}
              priorityCount={4}
              emptyHeading={noResultsHeading}
              emptyBody={noResultsBody}
            />

            {totalPages > 1 ? (
              <OliveShopPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPage={handlePage}
              />
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

/** The container rhythm the header and footer use, so every edge lines up. */
const containerStyle: CSSProperties = {
  maxWidth: "var(--olive-container)",
  marginInline: "auto",
  paddingInline: "var(--olive-section-pad-x)",
};

type OliveShopCollection = { id: string; name: string; slug: string };

/**
 * The collection tabs — dividers in the swatch book, not buttons.
 *
 * A radio group with one tab stop: Arrow keys move and select, Home and End
 * jump to the ends. "All" comes first and carries no chip, because it is not
 * a category — the chip discipline reserves the mark for the ones that are.
 */
function OliveCollectionTabs({
  collections,
  activeId,
  onChange,
}: {
  collections: OliveShopCollection[];
  activeId: string | null;
  onChange: (id: string | null) => void;
}) {
  const rowRef = useRef<HTMLDivElement | null>(null);

  const items: { id: string | null; name: string }[] = [
    { id: null, name: "All" },
    ...collections.map((collection) => ({
      id: collection.id,
      name: collection.name,
    })),
  ];

  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.id === activeId),
  );

  const tabs = () =>
    Array.from(
      rowRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]') ??
        [],
    );

  const moveTo = (index: number) => {
    const item = items[index];
    if (!item) return;
    tabs()[index]?.focus();
    onChange(item.id);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const active = tabs().indexOf(document.activeElement as HTMLButtonElement);
    const from = active >= 0 ? active : activeIndex;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        moveTo((from + 1) % items.length);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        moveTo((from - 1 + items.length) % items.length);
        break;
      case "Home":
        event.preventDefault();
        moveTo(0);
        break;
      case "End":
        event.preventDefault();
        moveTo(items.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div
      ref={rowRef}
      role="radiogroup"
      aria-label="Filter by collection"
      onKeyDown={onKeyDown}
      className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 py-0.5"
    >
      {items.map((item, index) => {
        const selected = item.id === activeId;
        return (
          <button
            key={item.id ?? "olive-all-collections"}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={index === activeIndex ? 0 : -1}
            onClick={() => onChange(item.id)}
            className="olive-label inline-flex shrink-0 items-center gap-2 whitespace-nowrap"
            style={{
              height: "2.25rem",
              paddingInline: "0.75rem",
              borderRadius: "var(--olive-card-radius)",
              border: `1px solid ${
                selected ? "var(--olive-leaf)" : "var(--olive-hairline)"
              }`,
              boxShadow: selected
                ? "inset 0 0 0 1px var(--olive-leaf)"
                : undefined,
              backgroundColor: selected
                ? "var(--olive-sage-tint)"
                : "var(--olive-white)",
              color: selected ? "var(--olive-leaf)" : "var(--olive-ink)",
              cursor: "pointer",
            }}
          >
            {item.id ? (
              <OliveChip
                color={oliveChipToken(index - 1)}
                label={item.name}
                size={12}
                srOnlyLabel={false}
              />
            ) : null}
            {item.name}
          </button>
        );
      })}
    </div>
  );
}

type PageEntry = number | "gap-start" | "gap-end";

/**
 * Windowed pagination: first, last, the current page and its neighbours, with
 * ellipses standing in for what is skipped. Every control is a 44px target and
 * the current page is marked, not merely coloured.
 */
function OliveShopPagination({
  currentPage,
  totalPages,
  onPage,
}: {
  currentPage: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  const pages: PageEntry[] = [];
  const rangeStart = Math.max(2, currentPage - 1);
  const rangeEnd = Math.min(totalPages - 1, currentPage + 1);

  pages.push(1);
  if (rangeStart > 2) pages.push("gap-start");
  for (let page = rangeStart; page <= rangeEnd; page++) pages.push(page);
  if (rangeEnd < totalPages - 1) pages.push("gap-end");
  pages.push(totalPages);

  return (
    <nav
      aria-label="Pagination"
      className="mt-12 flex flex-wrap items-center justify-center gap-2"
    >
      <OlivePageButton
        onClick={() => onPage(currentPage - 1)}
        disabled={currentPage === 1}
        wide
      >
        Previous
      </OlivePageButton>

      {pages.map((entry) =>
        entry === "gap-start" || entry === "gap-end" ? (
          <span
            key={entry}
            aria-hidden="true"
            className="olive-caption flex h-11 w-6 items-center justify-center"
          >
            …
          </span>
        ) : (
          <OlivePageButton
            key={entry}
            onClick={() => onPage(entry)}
            active={entry === currentPage}
            label={`Page ${entry}`}
          >
            {entry}
          </OlivePageButton>
        ),
      )}

      <OlivePageButton
        onClick={() => onPage(currentPage + 1)}
        disabled={currentPage === totalPages}
        wide
      >
        Next
      </OlivePageButton>
    </nav>
  );
}

function OlivePageButton({
  children,
  onClick,
  disabled = false,
  active = false,
  wide = false,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  wide?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "olive-btn",
        active ? "olive-btn-primary" : "olive-btn-secondary",
      )}
      style={{
        height: "2.75rem",
        minWidth: "2.75rem",
        paddingInline: wide ? "1.125rem" : "0.5rem",
        fontSize: "0.8125rem",
      }}
    >
      {children}
    </button>
  );
}
