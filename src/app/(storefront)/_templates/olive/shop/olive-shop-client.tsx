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
  OliveCheckbox,
  OliveEmptyState,
  OliveProductGrid,
  OliveReveal,
  OliveSelect,
} from "../shared";

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
 * An ivory title block, then a toolbar between two hairlines that pins under
 * the header (`--olive-header-h`): text tabs for the collections on the left,
 * the count, the stock switch and the sort on the right — all readable however
 * far down a long grid the shopper is. Everything it controls comes from `useShopFilters`;
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
    pageLinkProps,
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

  // Re-deal the grid when the results changed for a *reason* — never on the
  // page's first render, or the dealt-card stagger would replay on mount
  // instead of only on an actual filter/sort/page interaction. The signature
  // deliberately carries no field values, so a live-editor keystroke never
  // touches it.
  const dealSignature = `${activeCollectionId ?? ""}|${sortParam}|${inStockOnly}|${currentPage}`;
  const initialDealSignature = useRef(dealSignature);
  const dealKey =
    dealSignature === initialDealSignature.current ? undefined : dealSignature;

  return (
    <section
      aria-labelledby="olive-shop-heading"
      style={{ backgroundColor: "var(--olive-ivory)" }}
      {...sectionAttrs}
    >
      {/* Title block — heading plus one line, and nothing else above it. */}
      <div style={containerStyle} className="pt-10 pb-8 md:pt-16 md:pb-10">
        <OliveReveal className="flex flex-col gap-4">
          <h1
            id="olive-shop-heading"
            className="olive-h1"
            {...(headingFieldKey ? fieldAttr(headingFieldKey) : {})}
          >
            {heading}
          </h1>
          {body ? (
            <p
              className="max-w-[58ch] text-[0.9375rem] leading-[1.7]"
              style={{ color: "var(--olive-ink-soft)" }}
              {...(bodyFieldKey ? fieldAttr(bodyFieldKey) : {})}
            >
              {body}
            </p>
          ) : null}
        </OliveReveal>
      </div>

      {/* Sticky toolbar — between two hairlines, pinned under the header. */}
      {hasProducts ? (
        <div
          className="sticky z-20"
          style={{
            top: "var(--olive-header-h)",
            backgroundColor: "var(--olive-ivory)",
            borderTop: "1px solid var(--olive-hairline)",
            borderBottom: "1px solid var(--olive-hairline)",
          }}
        >
          {/* One row at lg: the tabs take the free width (scrolling
              sideways when they overflow) and the count · stock · sort
              cluster keeps its natural width on the right, every control
              centred on the tab row's 44px line. Below lg: tabs, then a row
              with the count left and the filters right. */}
          <div
            style={containerStyle}
            className="flex flex-col lg:flex-row lg:items-center lg:gap-10"
          >
            {collections.length > 0 ? (
              <div className="min-w-0 lg:flex-1">
                <OliveCollectionTabs
                  collections={collections}
                  activeId={activeCollectionId}
                  onChange={setActiveCollectionId}
                />
              </div>
            ) : (
              <span aria-hidden="true" className="hidden lg:block lg:flex-1" />
            )}

            <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 py-2 lg:flex-none lg:flex-nowrap lg:justify-end lg:gap-x-7 lg:py-1.5">
              <p
                className="olive-label olive-tabular m-0 whitespace-nowrap"
                aria-live="polite"
                aria-atomic="true"
                style={{ color: "var(--olive-taupe-ink)" }}
              >
                {count} {count === 1 ? "item" : "items"}
              </p>

              <div className="flex items-center gap-x-5 lg:gap-x-7">
                <span className="inline-flex min-h-11 items-center gap-2.5">
                  <OliveCheckbox
                    id={stockId}
                    checked={inStockOnly}
                    onChange={(event) => handleInStock(event.target.checked)}
                  />
                  <label
                    htmlFor={stockId}
                    className="olive-label cursor-pointer whitespace-nowrap"
                    style={{ color: "var(--olive-espresso)" }}
                  >
                    In stock only
                  </label>
                </span>

                <span className="inline-flex items-center gap-2.5">
                  <label
                    htmlFor={sortId}
                    className="olive-label max-sm:sr-only"
                  >
                    Sort
                  </label>
                  <OliveSelect
                    id={sortId}
                    value={sortParam}
                    onChange={(event) =>
                      handleSort(event.target.value as SortOption)
                    }
                    // Size is set inline on purpose: the scoped
                    // `.olive .olive-select` rule is unlayered and would beat
                    // Tailwind utilities. 44px tall, centred on the tab line.
                    style={{
                      width: "auto",
                      height: "2.75rem",
                      minHeight: "2.75rem",
                      paddingBlock: 0,
                      fontSize: "0.875rem",
                    }}
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
          </div>
        </div>
      ) : null}

      {/* The grid */}
      <div style={containerStyle} className="pt-8 pb-16 md:pt-12 md:pb-24">
        {count === 0 ? (
          <OliveReveal>
            <OliveEmptyState
              headingAs="h2"
              heading={hasProducts ? noResultsHeading : emptyHeading}
              body={hasProducts ? noResultsBody : emptyBody}
              cta={
                hasProducts
                  ? undefined
                  : { label: "Say hello", href: "/contact" }
              }
            >
              {hasProducts && hasActiveFilters ? (
                <OliveButton
                  variant="outline"
                  onClick={clearFilters}
                  className="mt-1"
                >
                  Clear filters
                </OliveButton>
              ) : null}
            </OliveEmptyState>
          </OliveReveal>
        ) : (
          <>
            <OliveProductGrid
              headingLevel={2}
              products={paginated}
              columns={4}
              priorityCount={4}
              emptyHeading={noResultsHeading}
              emptyBody={noResultsBody}
              dealKey={dealKey}
            />

            {totalPages > 1 ? (
              <OliveReveal>
                <OliveShopPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  pageLinkProps={pageLinkProps}
                />
              </OliveReveal>
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
 * The collection tabs — tracked-caps text, no boxes, no dots.
 *
 * A radio group with one tab stop: Arrow keys move and select, Home and End
 * jump to the ends. The chosen tab is espresso with a 1px espresso underline
 * (the rule is drawn by `.olive-shop-tab::after`, so hover can preview it);
 * the row scrolls sideways on a phone without widening the page.
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
      className="olive-shop-tabs"
    >
      {items.map((item, index) => (
        <button
          key={item.id ?? "olive-all-collections"}
          type="button"
          role="radio"
          aria-checked={item.id === activeId}
          tabIndex={index === activeIndex ? 0 : -1}
          onClick={() => onChange(item.id)}
          className="olive-shop-tab olive-label"
        >
          {item.name}
        </button>
      ))}
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
  pageLinkProps,
}: {
  currentPage: number;
  totalPages: number;
  pageLinkProps: ReturnType<typeof useShopFilters>["pageLinkProps"];
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
      className="mt-14 flex flex-wrap items-center justify-center gap-1.5"
    >
      <OlivePageButton
        linkProps={
          currentPage === 1 ? undefined : pageLinkProps(currentPage - 1)
        }
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
            className="olive-label flex h-11 w-6 items-center justify-center"
          >
            …
          </span>
        ) : (
          <OlivePageButton
            key={entry}
            linkProps={pageLinkProps(entry)}
            active={entry === currentPage}
            label={`Page ${entry}`}
          >
            {entry}
          </OlivePageButton>
        ),
      )}

      <OlivePageButton
        linkProps={
          currentPage === totalPages
            ? undefined
            : pageLinkProps(currentPage + 1)
        }
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
  linkProps,
  disabled = false,
  active = false,
  wide = false,
  label,
}: {
  children: React.ReactNode;
  /** `pageLinkProps(n)` — omitted when the control is disabled. */
  linkProps?: ReturnType<ReturnType<typeof useShopFilters>["pageLinkProps"]>;
  disabled?: boolean;
  active?: boolean;
  wide?: boolean;
  label?: string;
}) {
  const common = {
    "aria-label": label,
    "aria-current": active ? ("page" as const) : undefined,
    className: cn(
      "olive-page-btn olive-label olive-tabular",
      active && "is-active",
      wide && "is-wide",
    ),
  };

  if (disabled || !linkProps) {
    return (
      <button type="button" disabled={disabled} {...common}>
        {children}
      </button>
    );
  }

  return (
    <a {...linkProps} {...common}>
      {children}
    </a>
  );
}
