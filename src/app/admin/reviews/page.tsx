import type { FilterDefFor } from "../_components/admin-filters";
import { requireAdminAccess } from "~/lib/require-admin-access";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import {
  getReviewStatus,
  REVIEW_SORT_DEFAULT,
  REVIEW_SORT_VALUES,
  REVIEW_SOURCE_DEFAULT,
  REVIEW_SOURCE_VALUES,
  REVIEW_STATUS_DEFAULT,
  REVIEW_STATUS_VALUES,
} from "~/lib/validators/reviews";
import { api } from "~/trpc/server";

import { TrailHeader } from "../_components/trail-header";
import { buildTablePage, matchesAllTokens, pickParam } from "../_lib/table-query";
import { ReviewsActions } from "./_components/reviews-actions";
import { ReviewsClient } from "./_components/reviews-client";

type Props = {
  searchParams: Promise<{
    search?: string;
    status?: string;
    source?: string;
    sort?: string;
    page?: string;
  }>;
};

/** Rows per page — the platform standard (docs/admin-table-migration.md §2). */
const PAGE_SIZE = 25;

// Pinned to the validator tuples so a UI option with no matching value (or a
// value with no UI option) is a type error, not a silent drift. Menu order =
// tuple order.
const STATUS_FILTER: FilterDefFor<typeof REVIEW_STATUS_VALUES> = {
  key: "status",
  label: "Status",
  defaultValue: REVIEW_STATUS_DEFAULT,
  options: [
    { value: "all", label: "All reviews" },
    { value: "pending", label: "Pending" },
    { value: "published", label: "Published" },
    { value: "hidden", label: "Hidden" },
  ],
};

const SOURCE_FILTER: FilterDefFor<typeof REVIEW_SOURCE_VALUES> = {
  key: "source",
  label: "Source",
  defaultValue: REVIEW_SOURCE_DEFAULT,
  options: [
    { value: "all", label: "All sources" },
    { value: "customer", label: "Customer submitted" },
    { value: "owner", label: "Owner added" },
  ],
};

const SORT_FILTER: FilterDefFor<typeof REVIEW_SORT_VALUES> = {
  key: "sort",
  label: "Sort",
  defaultValue: REVIEW_SORT_DEFAULT,
  options: [
    { value: "newest", label: "Newest first" },
    { value: "oldest", label: "Oldest first" },
    { value: "rating-high", label: "Rating: high to low" },
    { value: "rating-low", label: "Rating: low to high" },
    { value: "most-helpful", label: "Most helpful" },
  ],
};

export default async function ReviewsPage({ searchParams }: Props) {
  // No feature-gate check here — `layout.tsx` already gates this whole
  // subtree with the identical `flags.isEnabled("reviews")` check.
  const params = await searchParams;

  // Same guard `/admin/layout.tsx` already ran, called again for its
  // resolved `membershipRole` — which is what decides whether the bulk bar
  // may offer Delete at all.
  const { session, membershipRole } = await requireAdminAccess();
  // Mirrors `ownerOnlyProcedure`, which `review.bulkDelete` uses:
  // PLATFORM_ADMIN bypasses the membership check, everyone else needs OWNER.
  // The procedure is still the enforcement — this only stops the UI offering
  // what it will refuse.
  const canBulkDelete =
    session.user.platformRole === "PLATFORM_ADMIN" ||
    membershipRole === "OWNER";

  const all = await api.review.listAll().catch(rethrowTrpcForErrorBoundary);

  // Single derivation site: the filter predicate below and the client's
  // status badge both read `row.status` — the client never re-derives it.
  const rows = all.map((review) => ({
    ...review,
    status: getReviewStatus(review),
  }));

  const search = params.search?.trim() ?? "";
  const status = pickParam(
    params.status,
    REVIEW_STATUS_VALUES,
    REVIEW_STATUS_DEFAULT,
  );
  const source = pickParam(
    params.source,
    REVIEW_SOURCE_VALUES,
    REVIEW_SOURCE_DEFAULT,
  );
  const sort = pickParam(params.sort, REVIEW_SORT_VALUES, REVIEW_SORT_DEFAULT);

  const matching = rows.filter((row) => {
    const matchesSearch = matchesAllTokens(search, [
      row.customerName,
      row.customerEmail,
      row.title,
      row.comment,
      row.customerTitle,
      row.product.name,
    ]);
    const matchesStatus = status === "all" || row.status === status;
    const matchesSource = source === "all" || row.source === source;
    return matchesSearch && matchesStatus && matchesSource;
  });

  const { pageItems, matchingIds, totalCount, totalPages, page } =
    buildTablePage(matching, {
      pageParam: params.page,
      pageSize: PAGE_SIZE,
      comparePrimary: (a, b) => {
        switch (sort) {
          case "oldest":
            return a.reviewDate.getTime() - b.reviewDate.getTime();
          case "rating-high":
            return (
              b.rating - a.rating || b.reviewDate.getTime() - a.reviewDate.getTime()
            );
          case "rating-low":
            return (
              a.rating - b.rating || b.reviewDate.getTime() - a.reviewDate.getTime()
            );
          case "most-helpful":
            return (
              b.helpfulCount - a.helpfulCount ||
              b.reviewDate.getTime() - a.reviewDate.getTime()
            );
          case "newest":
          default:
            // Matches REVIEW_SORT_DEFAULT. The id tie-break is appended by
            // buildTablePage, not repeated here.
            return b.reviewDate.getTime() - a.reviewDate.getTime();
        }
      },
    });

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Product Reviews" }]} />
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Product Reviews</h1>
            <p>Manage your product reviews</p>
          </div>
          <ReviewsActions />
        </div>

        <ReviewsClient
          reviews={pageItems}
          filters={[STATUS_FILTER, SOURCE_FILTER, SORT_FILTER]}
          matchingIds={matchingIds}
          totalReviews={rows.length}
          totalCount={totalCount}
          totalPages={totalPages}
          page={page}
          pageSize={PAGE_SIZE}
          canBulkDelete={canBulkDelete}
        />
      </div>
    </>
  );
}

export const metadata = {
  title: "Product Reviews",
};
