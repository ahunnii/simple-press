import { z } from "zod";

import {
  ADMIN_BULK_DELETE_LIMIT,
  ADMIN_BULK_SELECTION_LIMIT,
} from "~/lib/validators/admin-table";

/**
 * Shared vocabulary and derivations for the TWO admin lists backed by the
 * `Page` model — CMS pages (`type: "page"`) at `/admin/content/pages` and blog
 * posts (`type: "blog"`) at `/admin/content/blog`.
 *
 * They are one model with a `type` discriminator, one shared client component
 * (`src/app/admin/content/_components/page-list-client.tsx`) and one pair of
 * bulk procedures (`content.bulkSetPublished` / `content.bulkDelete`), so the
 * status derivation, the sort comparator and the bulk schemas live here once
 * rather than twice. Policies (`type: "policy"`) are deliberately NOT covered —
 * that list has not been migrated.
 */

// ─── Admin tables: filter/sort vocabulary ───────────────────────────────────

/**
 * The accepted values for both Page lists' filter and sort params.
 *
 * These live here, outside both the router and the pages, because they are one
 * contract with halves that fail differently when they drift — the same hazard
 * `src/lib/validators/customer.ts` documents, and the same shape of consumer as
 * Events/Discounts/Reviews: `content.getPages` is an **in-memory** pipeline
 * (filtered/sorted/paginated on the page via `buildTablePage`), so there is no
 * router `z.enum` for the filter or sort params to keep in sync. The two halves
 * that do exist are each page's `pickParam` calls and the `FilterDefFor` option
 * lists that render the dropdowns:
 *
 * - An option offered in the UI that `pickParam` doesn't recognize against
 *   these tuples is a **silent** failure: `pickParam` falls back to the
 *   default, so the control appears selected while the rows stay unfiltered or
 *   unsorted. (Were one of these tuples ever fed to a router `z.enum` instead,
 *   the same drift would be a **crash** — tRPC BAD_REQUEST escalated to the
 *   error boundary by `rethrowTrpcForErrorBoundary` — which is why the tuple,
 *   not the option list, is the source of truth.)
 * - A default that disagrees between the two is **silent** too: `AdminFilters`
 *   deletes a param set to its `defaultValue`, so the page applies its own and
 *   the control reads as selected while doing nothing.
 *
 * One `as const` tuple per param per entity. Tuple order is menu order —
 * `FilterDefFor` maps each tuple positionally into the dropdown's options.
 */

/**
 * CMS pages have no `scheduled` status option: `page-editor.tsx` exposes no
 * scheduling control, so only an API write or a legacy import can leave
 * `Page.scheduledPublishAt` set on a `type: "page"` row. Offering a filter
 * option that can never match is worse than not offering it — see
 * `getPageStatus`, which collapses `scheduled` into `draft` for this list so
 * such a row is still reachable under Drafts rather than invisible to every
 * filter but "All pages".
 */
export const PAGE_STATUS_VALUES = ["all", "published", "draft"] as const;
export const PAGE_STATUS_DEFAULT = "all";
export type PageStatusValue = (typeof PAGE_STATUS_VALUES)[number];

/** Blog posts DO get a scheduling control (`blog-page-editor.tsx`), so the blog
 *  list carries the extra status the pages list can't use. */
export const BLOG_STATUS_VALUES = [
  "all",
  "published",
  "scheduled",
  "draft",
] as const;
export const BLOG_STATUS_DEFAULT = "all";
export type BlogStatusValue = (typeof BLOG_STATUS_VALUES)[number];

/** The derived per-row status — the union of every non-"all" filter value. */
export type PageStatus = Exclude<BlogStatusValue, "all">;

/**
 * `newest` / `oldest` are keyed on **`updatedAt`**, not `createdAt`, on BOTH
 * lists — and the Updated column both tables render is that same key, so the
 * visible date always explains the order (the lesson Reviews and Testimonials
 * paid for: a displayed date that isn't the sort key reads as a broken sort).
 * For CMS content "when did I last touch this" is the question owners actually
 * ask; creation date answers nothing useful about a page that has been edited
 * for three years. The labels say "Recently updated" / "Least recently
 * updated" so the naming can't mislead.
 */
export const PAGE_SORT_VALUES = [
  "newest",
  "oldest",
  "title-asc",
  "title-desc",
] as const;
export const PAGE_SORT_DEFAULT = "newest";
export type PageSortValue = (typeof PAGE_SORT_VALUES)[number];

/**
 * Blog adds the two published-date sorts and defaults to them: a blog is read
 * as a reverse-chronological feed, so "most recently published first" is the
 * order the owner already has in their head. The blog table renders a
 * Published column to give those two sorts a visible cause.
 */
export const BLOG_SORT_VALUES = [
  "published-desc",
  "published-asc",
  "newest",
  "oldest",
  "title-asc",
  "title-desc",
] as const;
export const BLOG_SORT_DEFAULT = "published-desc";
export type BlogSortValue = (typeof BLOG_SORT_VALUES)[number];

// ─── Admin tables: derivations ──────────────────────────────────────────────

/**
 * The single status derivation for both admin Page lists. Every consumer that
 * must never disagree reads it: each page's status filter predicate and the
 * shared client's status badge + mobile reflow line.
 *
 * Priority is **published ▸ scheduled ▸ draft**, checked in that order.
 *
 * Like `getEventStatus`, this reads the row's mechanical columns only and
 * takes no `now`: `scheduledPublishAt` is *nulled* by whoever publishes the row
 * (the cron sweep in `src/app/api/cron/route.ts`, `blog-page-editor.tsx`'s
 * `published ? null : …`, and `content.bulkSetPublished`), so a non-null value
 * on an unpublished row already means "publish is pending" — no clock reading
 * required. That also keeps the derivation free of `Date.now()`, which would be
 * an SSR/hydration hazard: a row whose scheduled instant falls between the
 * server render and the client's first paint would otherwise land on different
 * sides of the split. The consequence is that a schedule the cron has not yet
 * caught up with still reads "Scheduled" rather than flickering through
 * "Draft" on its way to "Published" — the cron-lag-tolerant answer, matching
 * how `isEventPast` treats its own cron.
 *
 * `allowScheduled` is false for the CMS pages list, which offers no Scheduled
 * filter option (see `PAGE_STATUS_VALUES`). Collapsing to `draft` there keeps
 * the badge and the Drafts filter in agreement, instead of stranding the row
 * outside every filter but "All pages".
 */
export function getPageStatus(
  page: { published: boolean; scheduledPublishAt: Date | null },
  options: { allowScheduled: boolean },
): PageStatus {
  if (page.published) return "published";
  if (options.allowScheduled && page.scheduledPublishAt != null) {
    return "scheduled";
  }
  return "draft";
}

/** The row fields both lists sort on. Structural, so either page's richer row
 *  type satisfies it — including `buildTablePage`'s `Omit<Row, "id">`. */
export type PageSortRow = {
  title: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * The PRIMARY ordering shared by both Page lists — everything except the `id`
 * tie-break, which `buildTablePage` always appends itself.
 *
 * Shared rather than a `switch` per page (the usual playbook shape) because
 * these are two lists over one model with one overlapping vocabulary:
 * `PAGE_SORT_VALUES` is a subset of `BLOG_SORT_VALUES`, so a per-page copy
 * would be four identical branches that are free to drift on what `newest`
 * even means. `sort` is typed as the wider blog union; the pages list can only
 * ever pass the four it whitelists.
 *
 * Never-published rows sort **last** under both published-date sorts (`asc`
 * included), mirroring the storefront listing's
 * `{ publishedAt: { sort: "desc", nulls: "last" } }` in `content.getBlogPages`:
 * a draft has no place in a chronological feed at either end.
 */
export function comparePageListRows(
  sort: BlogSortValue,
  a: PageSortRow,
  b: PageSortRow,
): number {
  switch (sort) {
    case "published-desc":
    case "published-asc": {
      const aAt = a.publishedAt?.getTime();
      const bAt = b.publishedAt?.getTime();
      if (aAt === undefined || bAt === undefined) {
        // Nulls last in BOTH directions, so the two branches share this test.
        if (aAt === bAt) return a.title.localeCompare(b.title);
        return aAt === undefined ? 1 : -1;
      }
      const delta = sort === "published-desc" ? bAt - aAt : aAt - bAt;
      // Same-day imports and bulk publishes share an instant; the title
      // tie-break makes that visible ordering rather than id-order, which
      // reads as random. (The id tie-break is still appended by
      // `buildTablePage` — this only keeps ties from reaching it.)
      return delta || a.title.localeCompare(b.title);
    }
    case "oldest":
      return a.updatedAt.getTime() - b.updatedAt.getTime();
    case "title-asc":
      return a.title.localeCompare(b.title);
    case "title-desc":
      return b.title.localeCompare(a.title);
    case "newest":
    default:
      // Matches PAGE_SORT_DEFAULT.
      return b.updatedAt.getTime() - a.updatedAt.getTime();
  }
}

// ─── Admin tables: bulk schemas ─────────────────────────────────────────────

// Caps come from ~/lib/validators/admin-table, shared with every other admin
// list's bulk actions — delete is far below publish/unpublish on purpose.
// One schema pair for both lists: the procedures behind them are shared, and
// the noun in the message stays generic ("pages") because a blog post is a
// Page row too.
export const pageBulkPublishSchema = z.object({
  ids: z
    .array(z.string())
    .min(1, "At least one page id is required")
    .max(
      ADMIN_BULK_SELECTION_LIMIT,
      `Too many pages selected — publish or unpublish at most ${ADMIN_BULK_SELECTION_LIMIT} at a time`,
    ),
  published: z.boolean(),
});

export const pageBulkDeleteSchema = z.object({
  ids: z
    .array(z.string())
    .min(1, "At least one page id is required")
    .max(
      ADMIN_BULK_DELETE_LIMIT,
      `Too many pages selected — delete at most ${ADMIN_BULK_DELETE_LIMIT} at a time`,
    ),
});
