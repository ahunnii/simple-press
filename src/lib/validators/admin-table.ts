/**
 * Limits shared by every admin list page and the routers behind them.
 *
 * They live outside both halves because they are one contract: the page
 * whitelists what it sends, the router enforces what it accepts, and a bound
 * stated in only one of the two is a bound the other can be talked out of.
 */

/**
 * Upper bound on the `?page=` a router will act on.
 *
 * `skip` is `(page - 1) * pageSize`, so an unbounded page is an unbounded
 * offset: `?page=99999999999999999999` parses to 1e20, satisfies
 * `.int().positive()`, and reaches Postgres as an OFFSET of ~5e21 — past what
 * an i64 can hold, so the query engine errors and the page 500s.
 *
 * Bounded rather than rejected: the routers already clamp an over-range page
 * down to the last real one, so a nonsense page number should land the reader
 * on the last page like any other over-range value, not on an error screen.
 *
 * Applied in BOTH places for that reason — `parsePageParam` clamps what the
 * admin pages send, and each paginated router clamps its own input before
 * computing `skip`, because a tRPC procedure is callable without going through
 * a page.
 */
export const MAX_REQUESTED_PAGE = 1_000_000;

/**
 * Most rows a single non-destructive bulk action (publish, unpublish,
 * duplicate) may carry, and therefore the most rows a table lets you select.
 *
 * Enforced in three places that must agree: the selection hook stops offering
 * "select all N matching" above it, each client's over-cap guard fails fast with
 * a toast, and the bulk validators `.max()` it — the last of those is the real
 * enforcement, the other two only keep the UI from promising what the API would
 * refuse.
 */
export const ADMIN_BULK_SELECTION_LIMIT = 100;

/**
 * Most rows a single bulk DELETE may carry — deliberately far below the
 * selection limit, because deleting is the one bulk action that reaches outside
 * the database (S3 image cleanup) and takes storefront pages down with it.
 *
 * Enforced in the same three places as ADMIN_BULK_SELECTION_LIMIT; because the
 * two differ, the Delete action additionally disables itself with a reason once
 * the selection passes this, rather than waiting for the click.
 */
export const ADMIN_BULK_DELETE_LIMIT = 25;
