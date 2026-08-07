/**
 * The server-side pipeline behind the admin list pages that fetch every row and
 * narrow in the page rather than in the router — Collections, Services and
 * Inventory today.
 *
 * Those three routers deliberately stay input-free (other call sites want the
 * unfiltered list, and Inventory's stock filters read `sales`/`reservedQty`,
 * which only exist after the router merges its aggregates), so each page does
 * the same four steps: whitelist the search params, filter, sort, paginate.
 * Filtering and the primary sort order are domain-specific and stay in the
 * page; the whitelisting, the tie-break, and the page arithmetic are not, and
 * live here.
 */

import {
  ADMIN_BULK_SELECTION_LIMIT,
  MAX_REQUESTED_PAGE,
} from "~/lib/validators/admin-table";

/**
 * Narrow a raw search param to one of a fixed set of accepted values, falling
 * back rather than throwing — a stale bookmark or a hand-typed URL should show
 * the default view, not an error page.
 *
 * `allowed` is meant to be an `as const` tuple, which makes the return type the
 * union of its members instead of `string`. The one unavoidable cast lives in
 * here (`Array.includes` cannot narrow its argument), so call sites get a
 * correctly-typed value without writing `x as ValidSort` twice per param.
 */
export function pickParam<T extends readonly string[]>(
  value: string | undefined,
  allowed: T,
  fallback: T[number],
): T[number] {
  // Widened so `includes` accepts an arbitrary string; `allowed.includes` on a
  // literal tuple only accepts members of the tuple, which is the thing we are
  // trying to test for.
  const options: readonly string[] = allowed;
  return value !== undefined && options.includes(value)
    ? (value as T[number])
    : fallback;
}

/**
 * Coerce a raw `?page=` param to a positive integer, or undefined.
 * Server-paginated counterpart to the page arithmetic `buildTablePage` does
 * internally when narrowing in-memory results.
 *
 * The old `params.page ? Math.max(1, parseInt(params.page, 10)) : undefined`
 * turned `?page=abc` into `Math.max(1, NaN)` — which is NaN, not 1 — and handed
 * that straight to a validator like `.int().positive()`, so a typo'd or
 * truncated URL rendered a 500 instead of page one.
 *
 * Capped at MAX_REQUESTED_PAGE for the same reason: `?page=1e20` IS a positive
 * integer, and passing it through turns it into a Postgres OFFSET no i64 can
 * hold. Clamped rather than dropped, so an absurd page behaves like any other
 * over-range one and lands on the last page.
 */
export function parsePageParam(raw: string | undefined): number | undefined {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0
    ? Math.min(parsed, MAX_REQUESTED_PAGE)
    : undefined;
}

/**
 * Tokenized, order-insensitive search: split `query` on whitespace, and a row
 * matches only if EVERY token is a substring of AT LEAST ONE of `fields`
 * (AND of ORs). A single-token query behaves exactly like a plain substring
 * test, so this is a drop-in replacement for `needle.includes(...)` checks.
 *
 * Without this, searching "John Smith" against a customer whose name and
 * email each contain only "John" or only "Smith" — never both — matches
 * nothing, because a naive search treats the whole query as one substring
 * that has to live in a single field.
 *
 * `query` empty/whitespace-only matches everything (mirrors the existing
 * `needle === ""` short-circuit at every call site). `fields` entries that
 * are `null`/`undefined` are skipped rather than thrown on, since several
 * callers search nullable columns (a collection's `description`, etc.).
 */
export function matchesAllTokens(
  query: string,
  fields: Array<string | null | undefined>,
): boolean {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const haystacks = fields
    .filter((field): field is string => field != null)
    .map((field) => field.toLowerCase());

  return tokens.every((token) =>
    haystacks.some((haystack) => haystack.includes(token)),
  );
}

/**
 * The URL this page SHOULD be at given the page the server actually rendered,
 * or null when the current URL already says that.
 *
 * The server-paginated routers clamp an out-of-range `?page=` down to the last
 * real one and return the clamped value, which leaves the URL disagreeing with
 * the content: `?page=900` against a 3-page list renders page 3, the paginator
 * highlights 3, and clicking 3 is a no-op because the router's
 * `nextPage === page` guard compares against the RENDERED page while the href
 * still carries 900. Deleting the last row on the last page does the same thing
 * via `router.refresh()`. Redirecting to the canonical URL is what keeps the
 * two in sync.
 *
 * Compared as STRINGS against the raw param, not as numbers against the parsed
 * one, so every non-canonical spelling that renders page N resolves to the same
 * URL — `?page=abc`, `?page=01`, `?page=1` — and so the comparison is guaranteed
 * to be false after the redirect. A number comparison would treat the absent
 * param as "not 1" and redirect an ordinary first-page load to itself, forever.
 *
 * `page=1` is DELETED rather than written, matching `AdminPagination`'s
 * `hrefFor(1)`: the two must agree or the same view has two URLs, and the admin
 * tables' selection state keys off the param signature.
 */
export function canonicalPageHref(
  basePath: string,
  params: Record<string, string | undefined>,
  renderedPage: number,
): string | null {
  const canonical = renderedPage === 1 ? undefined : String(renderedPage);
  if (params.page === canonical) return null;

  const next = new URLSearchParams(
    Object.entries(params).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  );
  if (canonical === undefined) {
    next.delete("page");
  } else {
    next.set("page", canonical);
  }

  const qs = next.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/**
 * The PRIMARY ordering for a table — everything except the final tie-break.
 *
 * `id` is omitted from the row on purpose: `buildTablePage` always appends
 * `a.id.localeCompare(b.id)` itself, and a comparator that could also reach for
 * `id` would let a caller believe the tie-break is their job (and forget it on
 * one `case` out of nine). Reaching for `a.id` here is a type error precisely
 * because it is never needed.
 *
 * Multi-key primaries are fine and expected — `a.sortOrder - b.sortOrder ||
 * a.name.localeCompare(b.name)` is a primary ordering, just not a total one.
 */
export type PrimaryOrdering<Row> = (
  a: Omit<Row, "id">,
  b: Omit<Row, "id">,
) => number;

export type TablePage<Row> = {
  /** The rows for the requested page, in sorted order. */
  pageItems: Row[];
  /**
   * Ids of every row matching the current filters, across all pages, in the
   * same sorted order — feeds a bulk bar's "select all N matching" escalation.
   *
   * `null` when more than ADMIN_BULK_SELECTION_LIMIT rows match: the escalation
   * would hand the mutation more ids than its validator accepts, so it isn't
   * offered, and shipping the ids anyway would only bloat the RSC payload with
   * a list nothing can use. `null` is NOT `[]` — an empty array is a genuine
   * "nothing matched", and conflating the two produces a "Select all 0" link.
   *
   * Same contract `product.secureList` returns, so the selection hook and the
   * three admin tables handle one shape rather than two.
   */
  matchingIds: string[] | null;
  /** Rows matching the current filters, across all pages. */
  totalCount: number;
  /** Never below 1, so an empty table still reads as "page 1 of 1". */
  totalPages: number;
  /** The requested page, clamped into range. */
  page: number;
};

/**
 * Sort, count, clamp and slice a filtered row set in one step.
 *
 * Sorting and paginating are fused because they are one correctness concern,
 * not two. Sort keys in this admin are not unique — `sortOrder` duplicates are
 * routine (every row created before a `reorder` was ever run shares whatever
 * the create path assigned), and `name` is unique on none of these models — so
 * a comparator that ends on such a key can return 0 and leave those rows in
 * whatever order Postgres happened to return. That order is not stable across
 * executions: a heap-relocating UPDATE (exactly what an inventory adjustment
 * is) can flip two tied rows between one request and the next. Paginated, an
 * unstable tie silently renders one row on two pages and another on none.
 *
 * So the `id` tie-break is applied here rather than documented as a convention
 * for callers to follow, and there is no way to paginate a row set that has not
 * been through it. `id` is a cuid: unique, and stable for the life of the row.
 *
 * `pageParam` is taken raw for the same reason: parsing and clamping a
 * `?page=` belong to the same piece of arithmetic as `totalPages`, and
 * splitting them is how a slice ends up with a negative offset. Anything that
 * isn't a positive integer means page 1; anything past the end means the last
 * page — a stale link should show the final page, not an empty table.
 */
export function buildTablePage<Row extends { id: string }>(
  matching: readonly Row[],
  options: {
    comparePrimary: PrimaryOrdering<Row>;
    pageParam: string | undefined;
    pageSize: number;
  },
): TablePage<Row> {
  const { comparePrimary, pageParam, pageSize } = options;

  const sorted = [...matching].sort(
    (a, b) => comparePrimary(a, b) || a.id.localeCompare(b.id),
  );

  const totalCount = sorted.length;
  // `Math.max(1, …)`: zero results would otherwise give 0 pages, and the clamp
  // below would then produce page 0 and a slice starting at -pageSize.
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const requestedPage = Number.parseInt(pageParam ?? "", 10);
  const rawPage =
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const page = Math.min(rawPage, totalPages);

  return {
    pageItems: sorted.slice((page - 1) * pageSize, page * pageSize),
    // A plain length comparison, where `product.secureList` needs a `take:
    // LIMIT + 1` query to answer the same question: these pages already hold
    // every matching row in memory, so there is nothing to save by not looking.
    matchingIds:
      totalCount > ADMIN_BULK_SELECTION_LIMIT
        ? null
        : sorted.map((row) => row.id),
    totalCount,
    totalPages,
    page,
  };
}
