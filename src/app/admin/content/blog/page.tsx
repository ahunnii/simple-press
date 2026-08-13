import { requireAdminAccess } from "~/lib/require-admin-access";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import {
  BLOG_SORT_DEFAULT,
  BLOG_SORT_VALUES,
  BLOG_STATUS_DEFAULT,
  BLOG_STATUS_VALUES,
  comparePageListRows,
  getPageStatus,
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

// Same shape as the Pages list's filter defs; the vocabulary differs because
// blog posts have a scheduling control and two publish-date sorts that CMS
// pages have no equivalent for. `FilterDefFor` pins each option list to the
// tuple in `~/lib/validators/content-pages`, so an option with no matching
// value (or a value with no option) is a type error. Menu order = tuple order.
const STATUS_FILTER: FilterDefFor<typeof BLOG_STATUS_VALUES> = {
  key: "status",
  label: "Status",
  defaultValue: BLOG_STATUS_DEFAULT,
  options: [
    { value: "all", label: "All posts" },
    { value: "published", label: "Published" },
    { value: "scheduled", label: "Scheduled" },
    { value: "draft", label: "Drafts" },
  ],
};

const SORT_FILTER: FilterDefFor<typeof BLOG_SORT_VALUES> = {
  key: "sort",
  label: "Sort",
  defaultValue: BLOG_SORT_DEFAULT,
  options: [
    { value: "published-desc", label: "Recently published" },
    { value: "published-asc", label: "Oldest published" },
    { value: "newest", label: "Recently updated" },
    { value: "oldest", label: "Least recently updated" },
    { value: "title-asc", label: "Title A–Z" },
    { value: "title-desc", label: "Title Z–A" },
  ],
};

export default async function AdminBlogPage({ searchParams }: Props) {
  // No feature-gate check here — `layout.tsx` already gates this whole subtree
  // with the identical `flags.isEnabled("blog")` check. That route gate is
  // also why `content.getPages` and the bulk procedures are deliberately
  // ungated: they serve the ungated Pages list and content hub too.
  const params = await searchParams;

  // Same guard `/admin/layout.tsx` already ran, called again for its resolved
  // `membershipRole` — which is what decides whether the bulk bar may offer
  // Delete at all. Mirrors `ownerOnlyProcedure`, which `content.bulkDelete`
  // uses: PLATFORM_ADMIN bypasses the membership check, everyone else needs
  // OWNER. The procedure is still the enforcement.
  const { session, membershipRole } = await requireAdminAccess();
  const canBulkDelete =
    session.user.platformRole === "PLATFORM_ADMIN" ||
    membershipRole === "OWNER";

  // `content.getPages` replaces the old `business.getWith({ includeBlog })`
  // fetch: same `type: "blog"` scoping, but a trimmed explicit select instead
  // of every column of every post (including each one's whole TipTap `content`
  // document) plus the entire Business row and its shipping zones. It also
  // means the old client's redundant `page.type === "blog"` re-filter — over a
  // set the server had already filtered — is gone.
  //
  // `business.timeZone` is threaded into the table so every date is formatted
  // with an EXPLICIT zone; see the note on the Pages list.
  const [all, business] = await Promise.all([
    api.content.getPages({ type: "blog" }).catch(rethrowTrpcForErrorBoundary),
    api.business.getWith({ includeSiteContent: false }),
  ]);

  // Single derivation site: the status filter predicate below and the client's
  // Status badge both read `row.status`. `allowScheduled: true` here — the
  // blog editor DOES expose a publish schedule, and this list offers the
  // matching filter option. `getPageStatus` reads mechanical columns only, so
  // no clock is read during render on either side of hydration.
  const rows = all.map((p) => ({
    ...p,
    status: getPageStatus(p, { allowScheduled: true }),
  }));

  const search = params.search?.trim() ?? "";
  const status = pickParam(
    params.status,
    BLOG_STATUS_VALUES,
    BLOG_STATUS_DEFAULT,
  );
  const sort = pickParam(params.sort, BLOG_SORT_VALUES, BLOG_SORT_DEFAULT);

  // Title, slug and excerpt — the same three the Pages list searches, and the
  // same three this table renders (playbook §7).
  const matching = rows.filter((row) => {
    const matchesSearch = matchesAllTokens(search, [
      row.title,
      row.slug,
      row.excerpt,
    ]);
    const matchesStatus = status === "all" || row.status === status;
    return matchesSearch && matchesStatus;
  });

  // `comparePageListRows` is shared with the Pages list — one model, one
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
          { label: "Blog" },
        ]}
      />
      <PageListClient
        kind="blog"
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
  title: "Blog",
};
