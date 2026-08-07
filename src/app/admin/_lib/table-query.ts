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
   */
  matchingIds: string[];
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
    matchingIds: sorted.map((row) => row.id),
    totalCount,
    totalPages,
    page,
  };
}
