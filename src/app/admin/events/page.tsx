import type { FilterDefFor } from "../_components/admin-filters";
import { requireAdminAccess } from "~/lib/require-admin-access";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import {
  EVENT_SORT_DEFAULT,
  EVENT_SORT_VALUES,
  EVENT_STATUS_DEFAULT,
  EVENT_STATUS_VALUES,
  EVENT_WHEN_DEFAULT,
  EVENT_WHEN_VALUES,
  getEventStatus,
  getEventWhen,
} from "~/lib/validators/events";
import { api } from "~/trpc/server";

import { TrailHeader } from "../_components/trail-header";
import {
  buildTablePage,
  matchesAllTokens,
  pickParam,
} from "../_lib/table-query";
import { EventsClient } from "./_components/events-client";

type Props = {
  searchParams: Promise<{
    search?: string;
    when?: string;
    status?: string;
    sort?: string;
    page?: string;
  }>;
};

/** Rows per page — the platform standard (docs/admin-table-migration.md §2). */
const PAGE_SIZE = 25;

// The filter definitions live here, next to the `pickParam` calls that
// whitelist the same tuples, and reach the client as a prop — the shape
// Products/Discounts/Reviews use. `FilterDefFor` pins each option list to the
// tuple `src/lib/validators/events.ts` exports, so a UI option with no
// matching value (or a value with no UI option) is a type error, not a silent
// drift. Menu order = tuple order.
const WHEN_FILTER: FilterDefFor<typeof EVENT_WHEN_VALUES> = {
  key: "when",
  label: "When",
  defaultValue: EVENT_WHEN_DEFAULT,
  options: [
    { value: "all", label: "All events" },
    { value: "upcoming", label: "Upcoming" },
    { value: "past", label: "Past" },
  ],
};

const STATUS_FILTER: FilterDefFor<typeof EVENT_STATUS_VALUES> = {
  key: "status",
  label: "Status",
  defaultValue: EVENT_STATUS_DEFAULT,
  options: [
    { value: "all", label: "Any status" },
    { value: "published", label: "Published" },
    { value: "draft", label: "Drafts" },
    { value: "archived", label: "Archived" },
  ],
};

const SORT_FILTER: FilterDefFor<typeof EVENT_SORT_VALUES> = {
  key: "sort",
  label: "Sort",
  defaultValue: EVENT_SORT_DEFAULT,
  options: [
    { value: "latest", label: "Latest first" },
    { value: "soonest", label: "Soonest first" },
    { value: "newest", label: "Recently added" },
    { value: "oldest", label: "First added" },
    { value: "name-asc", label: "Name A–Z" },
    { value: "name-desc", label: "Name Z–A" },
  ],
};

export default async function AdminEventsPage({ searchParams }: Props) {
  // No feature-gate check here — `layout.tsx` already gates this whole
  // subtree with the identical `flags.isEnabled("events")` check.
  const params = await searchParams;

  // Same guard `/admin/layout.tsx` already ran, called again for its
  // resolved `membershipRole` — which is what decides whether the bulk bar
  // may offer Delete at all.
  const { session, membershipRole } = await requireAdminAccess();
  // Mirrors `ownerOnlyProcedure`, which `events.bulkDelete` uses:
  // PLATFORM_ADMIN bypasses the membership check, everyone else needs OWNER.
  // The procedure is still the enforcement — this only stops the UI offering
  // what it will refuse.
  const canBulkDelete =
    session.user.platformRole === "PLATFORM_ADMIN" ||
    membershipRole === "OWNER";

  // `business.timeZone` is threaded down to every date this table renders:
  // `formatEventDate` takes an explicit zone precisely so the RSC render and
  // the client's first paint produce identical markup (see the docblock atop
  // `src/lib/events/format.ts`). Losing it would reintroduce a hydration
  // mismatch that only reproduces for viewers outside the shop's zone.
  const [all, business] = await Promise.all([
    api.events.getAll().catch(rethrowTrpcForErrorBoundary),
    api.business.getWith({ includeSiteContent: false }),
  ]);

  // Single derivation site: the filter predicates below and the client's
  // When/Status columns all read `row.when` / `row.status`, and the client
  // never calls `new Date()`/`Date.now()` during render — the old client did
  // (its Upcoming/Past tab split was computed from `Date.now()` at render
  // time), which is a latent SSR/hydration hazard: a row can land on
  // different sides of the cutoff on the server and on the client's first
  // paint.
  const now = new Date();
  const rows = all.map((e) => ({
    ...e,
    status: getEventStatus(e),
    when: getEventWhen(e, now),
  }));

  const search = params.search?.trim() ?? "";
  const when = pickParam(params.when, EVENT_WHEN_VALUES, EVENT_WHEN_DEFAULT);
  const status = pickParam(
    params.status,
    EVENT_STATUS_VALUES,
    EVENT_STATUS_DEFAULT,
  );
  const sort = pickParam(params.sort, EVENT_SORT_VALUES, EVENT_SORT_DEFAULT);

  // Name + location only (playbook §7: search what the table shows). `blurb`
  // is neither a column nor part of the mobile reflow line — and it isn't in
  // `events.getAll`'s select either.
  const matching = rows.filter((row) => {
    const matchesSearch = matchesAllTokens(search, [row.name, row.location]);
    const matchesWhen = when === "all" || row.when === when;
    const matchesStatus = status === "all" || row.status === status;
    return matchesSearch && matchesWhen && matchesStatus;
  });

  const { pageItems, matchingIds, totalCount, totalPages, page } =
    buildTablePage(matching, {
      pageParam: params.page,
      pageSize: PAGE_SIZE,
      comparePrimary: (a, b) => {
        switch (sort) {
          case "soonest":
            return (
              a.startAt.getTime() - b.startAt.getTime() ||
              a.name.localeCompare(b.name)
            );
          case "newest":
            return b.createdAt.getTime() - a.createdAt.getTime();
          case "oldest":
            return a.createdAt.getTime() - b.createdAt.getTime();
          case "name-asc":
            return a.name.localeCompare(b.name);
          case "name-desc":
            return b.name.localeCompare(a.name);
          case "latest":
          default:
            // Matches EVENT_SORT_DEFAULT (startAt descending keeps upcoming
            // events on page 1 of the all-events default view; past ones
            // sink). The name tie-break is *visible* ordering — same-day
            // events (a morning market and an evening pop-up share a date,
            // all-day rows share an instant) would otherwise be ordered by
            // id, which reads as random. The id tie-break is appended by
            // buildTablePage, not repeated here.
            return (
              b.startAt.getTime() - a.startAt.getTime() ||
              a.name.localeCompare(b.name)
            );
        }
      },
    });

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Events" }]} />
      <EventsClient
        events={pageItems}
        timeZone={business.timeZone}
        filters={[WHEN_FILTER, STATUS_FILTER, SORT_FILTER]}
        matchingIds={matchingIds}
        totalEvents={all.length}
        totalCount={totalCount}
        totalPages={totalPages}
        page={page}
        pageSize={PAGE_SIZE}
        canBulkDelete={canBulkDelete}
      />
    </>
  );
}

export const metadata = {
  title: "Events",
};
