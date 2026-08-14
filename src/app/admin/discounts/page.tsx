import type { FilterDefFor } from "../_components/admin-filters";
import { deactivateExpiredDiscountCodes } from "~/lib/deactivate-expired-discounts";
import { requireAdminAccess } from "~/lib/require-admin-access";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import {
  DISCOUNT_SORT_DEFAULT,
  DISCOUNT_SORT_VALUES,
  DISCOUNT_STATUS_DEFAULT,
  DISCOUNT_STATUS_VALUES,
  getDiscountStatus,
} from "~/lib/validators/discounts";
import { db } from "~/server/db";
import { api } from "~/trpc/server";

import { TrailHeader } from "../_components/trail-header";
import {
  buildTablePage,
  matchesAllTokens,
  pickParam,
} from "../_lib/table-query";
import { DiscountsClient } from "./_components/discounts-client";

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
// whitelist the same tuples, and reach the client as a prop — the shape
// Products uses. `FilterDefFor` pins each option list to the tuple
// `src/lib/validators/discounts.ts` exports, so a UI option with no matching
// value (or a value with no UI option) is a type error, not a silent drift.
const STATUS_FILTER: FilterDefFor<typeof DISCOUNT_STATUS_VALUES> = {
  key: "status",
  label: "Status",
  defaultValue: DISCOUNT_STATUS_DEFAULT,
  options: [
    { value: "all", label: "All discounts" },
    { value: "active", label: "Active" },
    { value: "scheduled", label: "Scheduled" },
    { value: "expired", label: "Expired" },
    { value: "inactive", label: "Inactive" },
  ],
};

const SORT_FILTER: FilterDefFor<typeof DISCOUNT_SORT_VALUES> = {
  key: "sort",
  label: "Sort",
  defaultValue: DISCOUNT_SORT_DEFAULT,
  options: [
    { value: "newest", label: "Newest" },
    { value: "code-asc", label: "Code A–Z" },
    { value: "code-desc", label: "Code Z–A" },
    { value: "oldest", label: "Oldest" },
    { value: "used-desc", label: "Most used" },
    { value: "expires-asc", label: "Expiring soonest" },
  ],
};

export default async function DiscountsPage({ searchParams }: Props) {
  // No feature-gate check here — `layout.tsx` already gates this whole
  // subtree with the identical `flags.isEnabled("coupons")` check.
  const params = await searchParams;

  // Same guard `/admin/layout.tsx` already ran, called again for its
  // resolved `membershipRole` — which is what decides whether the bulk bar
  // may offer Delete at all.
  const { session, business, membershipRole } = await requireAdminAccess();
  // Mirrors `ownerOnlyProcedure`, which `discount.bulkDelete` uses:
  // PLATFORM_ADMIN bypasses the membership check, everyone else needs OWNER.
  // The procedure is still the enforcement — this only stops the UI offering
  // what it will refuse.
  const canBulkDelete =
    session.user.platformRole === "PLATFORM_ADMIN" ||
    membershipRole === "OWNER";

  // Write-on-GET materializer preserved from the pre-migration page: flips
  // codes past their `expiresAt` or exhausted `usageLimit` to `active: false`
  // BEFORE the fetch below, so the list and the status filter both read
  // settled data rather than a stale `active` flag the next admin visit would
  // have corrected anyway.
  await deactivateExpiredDiscountCodes(db, business.id);

  const search = params.search?.trim() ?? "";
  const status = pickParam(
    params.status,
    DISCOUNT_STATUS_VALUES,
    DISCOUNT_STATUS_DEFAULT,
  );
  const sort = pickParam(
    params.sort,
    DISCOUNT_SORT_VALUES,
    DISCOUNT_SORT_DEFAULT,
  );

  // `discount.getAll` is input-free — closest model is Collections, not
  // Products: "scheduled"/"expired" are computed date windows Prisma can't
  // express against the `active` boolean, so filtering happens here rather
  // than in the router.
  const all = await api.discount.getAll().catch(rethrowTrpcForErrorBoundary);

  // Single derivation site: the filter predicate below and the client's
  // status badge both read `row.status`, and the client never calls
  // `new Date()` itself — that was the old table's SSR/hydration hazard
  // (a badge computed from `new Date()` during render can disagree between
  // the server-rendered markup and the client's first paint).
  const now = new Date();
  const rows = all.map((discount) => ({
    ...discount,
    status: getDiscountStatus(discount, now),
  }));

  // Code is the only searchable text this table renders — see
  // `discounts-table.tsx`'s prior columns; nothing else is free text.
  const matching = rows.filter((row) => {
    const matchesSearch = matchesAllTokens(search, [row.code]);
    const matchesStatus = status === "all" || row.status === status;
    return matchesSearch && matchesStatus;
  });

  const { pageItems, matchingIds, totalCount, totalPages, page } =
    buildTablePage(matching, {
      pageParam: params.page,
      pageSize: PAGE_SIZE,
      comparePrimary: (a, b) => {
        switch (sort) {
          case "code-asc":
            return a.code.localeCompare(b.code);
          case "code-desc":
            return b.code.localeCompare(a.code);
          case "oldest":
            return a.createdAt.getTime() - b.createdAt.getTime();
          case "used-desc":
            // Usage counts collide constantly at 0 (most codes are unused),
            // so the code is the visible tie-break rather than the id.
            return b.usageCount - a.usageCount || a.code.localeCompare(b.code);
          case "expires-asc": {
            // Null `expiresAt` sorts LAST: this sort answers "what's about
            // to lapse?", and a code that never lapses is the least urgent
            // row to see first.
            if (a.expiresAt === null && b.expiresAt === null) {
              return a.code.localeCompare(b.code);
            }
            if (a.expiresAt === null) return 1;
            if (b.expiresAt === null) return -1;
            return (
              a.expiresAt.getTime() - b.expiresAt.getTime() ||
              a.code.localeCompare(b.code)
            );
          }
          case "newest":
          default:
            return b.createdAt.getTime() - a.createdAt.getTime();
        }
      },
    });

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Discounts" }]} />
      <DiscountsClient
        discounts={pageItems}
        filters={[STATUS_FILTER, SORT_FILTER]}
        matchingIds={matchingIds}
        totalDiscounts={all.length}
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
  title: "Discounts",
};
