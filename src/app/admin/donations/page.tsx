import { requireAdminAccess } from "~/lib/require-admin-access";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";

import { TrailHeader } from "../_components/trail-header";
import { buildTablePage, matchesAllTokens } from "../_lib/table-query";
import { DonationsTable } from "./_components/donations-table";

type Props = {
  searchParams: Promise<{
    search?: string;
    page?: string;
  }>;
};

/** Rows per page — the platform standard (docs/admin-table-migration.md §2). */
const PAGE_SIZE = 25;

export default async function AdminDonationsPage({ searchParams }: Props) {
  const params = await searchParams;

  // Same guard `/admin/layout.tsx` already ran — called again here to match
  // the Collections/Subscriptions convention of every list page re-asserting
  // its own access rather than relying only on the layout.
  await requireAdminAccess();

  // `donation.list` is deliberately NOT feature-gated (see the router's doc
  // comment) — donations are money records, and this page must stay reachable
  // after the owner turns the `donations` flag back off, same as
  // `/admin/subscriptions`. Called unfiltered: the summary strip (all-time
  // total, count, this month) needs the WHOLE store regardless of what the
  // table is currently searched to.
  const allRows = await api.donation.list().catch(rethrowTrpcForErrorBoundary);

  const search = params.search?.trim() ?? "";

  // Encrypted donor columns (`donorName`/`donorEmail`/`message`) can never
  // appear in a Prisma `where` — `donation.list` always returns every row for
  // the business, and searching happens here, in memory, same as every other
  // encrypted-field search in this admin.
  const matching = allRows.filter((row) =>
    matchesAllTokens(search, [row.donorName, row.donorEmail, row.message]),
  );

  const { pageItems, totalCount, totalPages, page } = buildTablePage(
    matching,
    {
      pageParam: params.page,
      pageSize: PAGE_SIZE,
      comparePrimary: (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    },
  );

  const now = new Date();
  const summary = {
    totalCents: allRows.reduce((sum, row) => sum + row.amountCents, 0),
    count: allRows.length,
    thisMonthCents: allRows
      .filter(
        (row) =>
          row.createdAt.getFullYear() === now.getFullYear() &&
          row.createdAt.getMonth() === now.getMonth(),
      )
      .reduce((sum, row) => sum + row.amountCents, 0),
  };

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Donations" }]} />
      <DonationsTable
        rows={pageItems}
        totalCount={totalCount}
        totalPages={totalPages}
        page={page}
        pageSize={PAGE_SIZE}
        totalDonations={allRows.length}
        summary={summary}
      />
    </>
  );
}

export const metadata = {
  title: "Donations",
};
