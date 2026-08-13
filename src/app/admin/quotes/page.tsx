// Deliberately NOT feature-gated. Unlike most /admin subtrees there is no
// `layout.tsx` here checking `flags.isEnabled("quoteCalculator")` — do not
// add one. Quote submissions are business records: real leads with names,
// emails and phone numbers. An owner who turns the Quote Calculator feature
// off must still be able to read, work and delete the pipeline they already
// have; gating this page would turn disabling the feature into a way to lock
// an owner out of their own leads. This is the page-level extension of the
// same call already made one layer down — every procedure this page reads
// (`quoteSubmission.list` / `getById` / `updateStatus` / `bulkSetStatus` /
// `bulkDelete`) is itself deliberately ungated (see the NOTE atop
// `src/server/api/routers/quote-submission.ts`), which in turn mirrors the
// reviews router's moderation procedures (`src/server/api/routers/review.ts`).
// Reviews additionally gates its *page* via a layout.tsx, because an owner
// with reviews off has nothing time-sensitive waiting there; quotes are a
// live lead pipeline, so this page goes one step further and stays reachable
// no matter what the flag says. Don't "fix" this into consistency with
// Reviews by adding a gate — that would reintroduce the exact trap this
// comment exists to prevent.

import type { FilterDefFor } from "../_components/admin-filters";
import type { QuoteStatusDb } from "~/lib/validators/quote-calculator";
import { requireAdminAccess } from "~/lib/require-admin-access";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import {
  QUOTE_SORT_DEFAULT,
  QUOTE_SORT_VALUES,
  QUOTE_STATUS_DEFAULT,
  QUOTE_STATUS_FILTER_VALUES,
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_VALUES_DB,
} from "~/lib/validators/quote-calculator";
import { api } from "~/trpc/server";

import { TrailHeader } from "../_components/trail-header";
import {
  buildTablePage,
  matchesAllTokens,
  pickParam,
} from "../_lib/table-query";
import { QuoteInboxClient } from "./_components/quote-inbox-client";

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

// Pinned to the validator tuples in `~/lib/validators/quote-calculator` — a UI
// option with no matching value (or a value with no UI option) is a type
// error, not a silent drift. Menu order = tuple order.
const STATUS_FILTER: FilterDefFor<typeof QUOTE_STATUS_FILTER_VALUES> = {
  key: "status",
  label: "Status",
  defaultValue: QUOTE_STATUS_DEFAULT,
  options: [
    { value: "all", label: "Any status" },
    { value: "NEW", label: QUOTE_STATUS_LABELS.NEW },
    { value: "CONTACTED", label: QUOTE_STATUS_LABELS.CONTACTED },
    { value: "WON", label: QUOTE_STATUS_LABELS.WON },
    { value: "LOST", label: QUOTE_STATUS_LABELS.LOST },
  ],
};

const SORT_FILTER: FilterDefFor<typeof QUOTE_SORT_VALUES> = {
  key: "sort",
  label: "Sort",
  defaultValue: QUOTE_SORT_DEFAULT,
  options: [
    { value: "newest", label: "Newest first" },
    { value: "oldest", label: "Oldest first" },
    { value: "estimate-desc", label: "Highest estimate" },
    { value: "estimate-asc", label: "Lowest estimate" },
    { value: "name-asc", label: "Name A–Z" },
  ],
};

/**
 * `quoteSubmission.list`'s `status` column is a plain `String` in the schema
 * (see the comment on `QuoteSubmission.status` in prisma/schema.prisma), not
 * a database enum — it's written exclusively through `updateStatus` /
 * `bulkSetStatus`, both validated against `z.enum(QUOTE_STATUS_VALUES_DB)`.
 * Narrowing it once here, at the RSC boundary, is the one unavoidable cast
 * (same idiom as `pickParam`'s), so every downstream read — the filter
 * predicate, the Status badge, `QUOTE_STATUS_LABELS[...]` — gets the real
 * union instead of `string`. Falls back to "NEW" rather than throwing, same
 * reasoning as `pickParam`: a row with a corrupted status should render as
 * something, not 500 the whole inbox.
 */
function toQuoteStatus(status: string): QuoteStatusDb {
  const values: readonly string[] = QUOTE_STATUS_VALUES_DB;
  return values.includes(status) ? (status as QuoteStatusDb) : "NEW";
}

/**
 * Shared by both estimate sorts. A `null` estimate (a formula that failed to
 * evaluate, or a row from before estimates were tracked) sorts LAST
 * regardless of direction — "missing" is neither the cheapest nor the most
 * expensive quote, and letting it default to 0 would put every failed
 * estimate at the top of "Highest estimate".
 */
function compareEstimate(
  a: number | null,
  b: number | null,
  direction: 1 | -1,
): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return (a - b) * direction;
}

export default async function AdminQuotesPage({ searchParams }: Props) {
  const params = await searchParams;

  // Same guard `/admin/layout.tsx` already ran, called again for its
  // resolved `membershipRole` — which is what decides whether the bulk bar
  // may offer Delete at all.
  const { session, membershipRole } = await requireAdminAccess();
  // Mirrors `ownerOnlyProcedure`, which `quoteSubmission.bulkDelete` uses:
  // PLATFORM_ADMIN bypasses the membership check, everyone else needs OWNER.
  // The procedure is still the enforcement — this only stops the UI offering
  // what it will refuse.
  const canBulkDelete =
    session.user.platformRole === "PLATFORM_ADMIN" ||
    membershipRole === "OWNER";

  // Input-free (see the router's comment on `list`): the full tenant-scoped
  // set, filtered/sorted/paginated in memory here — same shape as Events.
  const all = await api.quoteSubmission
    .list()
    .catch(rethrowTrpcForErrorBoundary);

  const rows = all.map((row) => ({
    ...row,
    status: toQuoteStatus(row.status),
  }));

  const search = params.search?.trim() ?? "";
  const status = pickParam(
    params.status,
    QUOTE_STATUS_FILTER_VALUES,
    QUOTE_STATUS_DEFAULT,
  );
  const sort = pickParam(params.sort, QUOTE_SORT_VALUES, QUOTE_SORT_DEFAULT);

  // Contact name, email and calculator name — the three fields the table
  // actually shows. `answers`/`formulaSnapshot` aren't in this row shape at
  // all (see the router's `select`); they're detail-page-only.
  const matching = rows.filter((row) => {
    const matchesSearch = matchesAllTokens(search, [
      row.contactName,
      row.contactEmail,
      row.calculatorName,
    ]);
    const matchesStatus = status === "all" || row.status === status;
    return matchesSearch && matchesStatus;
  });

  const { pageItems, matchingIds, totalCount, totalPages, page } =
    buildTablePage(matching, {
      pageParam: params.page,
      pageSize: PAGE_SIZE,
      comparePrimary: (a, b) => {
        switch (sort) {
          case "oldest":
            return a.createdAt.getTime() - b.createdAt.getTime();
          // Sorts on the EFFECTIVE quote — the owner-adjusted final amount
          // when one exists, else the computed estimate — matching what the
          // Quote column displays.
          case "estimate-desc":
            return compareEstimate(
              a.finalQuoteCents ?? a.estimateCents,
              b.finalQuoteCents ?? b.estimateCents,
              -1,
            );
          case "estimate-asc":
            return compareEstimate(
              a.finalQuoteCents ?? a.estimateCents,
              b.finalQuoteCents ?? b.estimateCents,
              1,
            );
          case "name-asc":
            return a.contactName.localeCompare(b.contactName);
          case "newest":
          default:
            // Matches QUOTE_SORT_DEFAULT. The id tie-break is appended by
            // buildTablePage, not repeated here.
            return b.createdAt.getTime() - a.createdAt.getTime();
        }
      },
    });

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Quotes" }]} />
      <QuoteInboxClient
        submissions={pageItems}
        filters={[STATUS_FILTER, SORT_FILTER]}
        matchingIds={matchingIds}
        totalQuotes={all.length}
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
  title: "Quotes",
};
