import { requireAdminAccess } from "~/lib/require-admin-access";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import {
  comparePageListRows,
  getPageStatus,
  PAGE_SORT_DEFAULT,
  PAGE_SORT_VALUES,
  PAGE_STATUS_DEFAULT,
  PAGE_STATUS_VALUES,
} from "~/lib/validators/content-pages";
import { api } from "~/trpc/server";

import type { FilterDefFor } from "../../_components/admin-filters";
import { TrailHeader } from "../../_components/trail-header";
import {
  buildTablePage,
  matchesAllTokens,
  pickParam,
} from "../../_lib/table-query";
import { PageListClient } from "../_components/page-list-client";

type Props = {
  searchParams: Promise<{
    search?: string;
    status?: string;
    sort?: string;
    page?: string;
  }>;
};

/** Rows per page — the platform standard (docs/admin-table-migration.md §2). */
const PAGE_SIZE = 25;

// The filter definitions live here, next to the `pickParam` calls that
// whitelist the same tuples, and reach the client as a prop. `FilterDefFor`
// pins each option list to the tuple `~/lib/validators/content-pages` exports,
// so a UI option with no matching value (or a value with no UI option) is a
// type error rather than silent drift. Menu order = tuple order.
const STATUS_FILTER: FilterDefFor<typeof PAGE_STATUS_VALUES> = {
  key: "status",
  label: "Status",
  defaultValue: PAGE_STATUS_DEFAULT,
  options: [
    { value: "all", label: "All pages" },
    { value: "published", label: "Published" },
    { value: "draft", label: "Drafts" },
  ],
};

const SORT_FILTER: FilterDefFor<typeof PAGE_SORT_VALUES> = {
  key: "sort",
  label: "Sort",
  defaultValue: PAGE_SORT_DEFAULT,
  options: [
    { value: "newest", label: "Recently updated" },
    { value: "oldest", label: "Least recently updated" },
    { value: "title-asc", label: "Title A–Z" },
    { value: "title-desc", label: "Title Z–A" },
  ],
};

export default async function AdminContentPagesPage({ searchParams }: Props) {
  const params = await searchParams;

  // Same guard `/admin/layout.tsx` already ran, called again for its resolved
  // `membershipRole` — which is what decides whether the bulk bar may offer
  // Delete at all.
  const { session, membershipRole } = await requireAdminAccess();
  // Mirrors `ownerOnlyProcedure`, which `content.bulkDelete` uses:
  // PLATFORM_ADMIN bypasses the membership check, everyone else needs OWNER.
  // The procedure is still the enforcement — this only stops the UI offering
  // what it will refuse.
  const canBulkDelete =
    session.user.platformRole === "PLATFORM_ADMIN" ||
    membershipRole === "OWNER";

  // `content.getPages` replaces the old `business.getWith({ includePages })`
  // fetch: same `type: "page"` scoping, but a trimmed explicit select instead
  // of every column of every page (including each one's whole TipTap `content`
  // document) plus the entire Business row and its shipping zones.
  // `business.getWith` itself is untouched — /admin/content/navigation still
  // uses `includePages`.
  //
  // `business.timeZone` is threaded into the table so every date is formatted
  // with an EXPLICIT zone: the client renders the same string the RSC pass
  // did, instead of the old list's bare `toLocaleDateString()`, which resolves
  // against the server on one side of hydration and the viewer's machine on
  // the other.
  const [all, business] = await Promise.all([
    api.content.getPages({ type: "page" }).catch(rethrowTrpcForErrorBoundary),
    api.business.getWith({ includeSiteContent: false }),
  ]);

  // Single derivation site: the status filter predicate below and the client's
  // Status badge both read `row.status`, so the two cannot disagree.
  // `allowScheduled: false` — the CMS page editor has no scheduling control,
  // and this list offers no Scheduled filter option, so a row carrying a stray
  // `scheduledPublishAt` reads (and filters) as the draft it is rather than
  // dropping out of every filtered view. See `getPageStatus`.
  const rows = all.map((p) => ({
    ...p,
    status: getPageStatus(p, { allowScheduled: false }),
  }));

  const search = params.search?.trim() ?? "";
  const status = pickParam(
    params.status,
    PAGE_STATUS_VALUES,
    PAGE_STATUS_DEFAULT,
  );
  const sort = pickParam(params.sort, PAGE_SORT_VALUES, PAGE_SORT_DEFAULT);

  // Title, slug and excerpt — playbook §7: search what the row visibly
  // renders. The slug because a page is URL-addressable and the URL is a real
  // way an owner arrives here; the excerpt because the table RENDERS it under
  // the title, and text a person can read in a row but not search for is a
  // dead end. Tokenized, so a multi-word query can match across fields.
  const matching = rows.filter((row) => {
    const matchesSearch = matchesAllTokens(search, [
      row.title,
      row.slug,
      row.excerpt,
    ]);
    const matchesStatus = status === "all" || row.status === status;
    return matchesSearch && matchesStatus;
  });

  // `comparePageListRows` is shared with the Blog list — one model, one
  // overlapping sort vocabulary, so one comparator. `buildTablePage` appends
  // the `id` tie-break that keeps pagination stable.
  const { pageItems, matchingIds, totalCount, totalPages, page } =
    buildTablePage(matching, {
      pageParam: params.page,
      pageSize: PAGE_SIZE,
      comparePrimary: (a, b) => comparePageListRows(sort, a, b),
    });

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Pages" },
        ]}
      />
      <PageListClient
        kind="page"
        rows={pageItems}
        filters={[STATUS_FILTER, SORT_FILTER]}
        matchingIds={matchingIds}
        totalRows={all.length}
        totalCount={totalCount}
        totalPages={totalPages}
        page={page}
        pageSize={PAGE_SIZE}
        timeZone={business.timeZone}
        canBulkDelete={canBulkDelete}
      />
    </>
  );
}

export const metadata = {
  title: "Pages",
};
