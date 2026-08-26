import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { requireAdminAccess } from "~/lib/require-admin-access";
import { computeMonthlyRecurringCents } from "~/lib/subscriptions/mrr";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { SUBSCRIPTION_STATUS_FILTER_VALUES } from "~/lib/validators/subscription";
import { api } from "~/trpc/server";

import { TrailHeader } from "../_components/trail-header";
import {
  buildTablePage,
  matchesAllTokens,
  pickParam,
} from "../_lib/table-query";
import { SubscriptionsTable } from "./_components/subscriptions-table";

type Props = {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
  }>;
};

/** Rows per page — the platform standard (docs/admin-table-migration.md §2). */
const PAGE_SIZE = 25;

export default async function AdminSubscriptionsPage({ searchParams }: Props) {
  const params = await searchParams;

  // Same guard `/admin/layout.tsx` already ran — called again here to match
  // the Collections/Orders-detail convention of every list/detail page
  // re-asserting its own access rather than relying only on the layout.
  await requireAdminAccess();

  // No layout.tsx gates this subtree — `subscriptions` is `ownerCanToggle:
  // true` and `subscription.list`/`get`/`cancel` are ungated reads/escape
  // hatches (see the router's doc comment), so the page must stay reachable
  // while the flag is off, same as `/admin/invoices`. `featureEnabled` is
  // threaded through to the client to disable write actions instead.
  const [flags, allRows] = await Promise.all([
    getBusinessFlags(),
    api.subscription.list({}).catch(rethrowTrpcForErrorBoundary),
  ]);
  const featureEnabled = flags.isEnabled("subscriptions");

  // `subscription.list` accepts a status/search filter itself, but this page
  // deliberately calls it unfiltered — the summary strip's counts (active,
  // paused, past due, MRR) need to reflect the WHOLE store regardless of what
  // the owner is currently filtering the table to, matching the invoices
  // page's `listInvoices()` (unfiltered) + `buildTablePage` pattern.
  const search = params.search?.trim() ?? "";
  const status = pickParam(
    params.status,
    SUBSCRIPTION_STATUS_FILTER_VALUES,
    "all",
  );

  const matching = allRows.filter((row) => {
    const matchesSearch = matchesAllTokens(search, [
      row.customerEmail,
      row.customerName,
      row.productName,
      row.variantName,
    ]);
    const matchesStatus = status === "all" || row.status === status;
    return matchesSearch && matchesStatus;
  });

  const { pageItems, totalCount, totalPages, page } = buildTablePage(matching, {
    pageParam: params.page,
    pageSize: PAGE_SIZE,
    comparePrimary: (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  });

  const summary = {
    active: allRows.filter((row) => row.status === "active").length,
    paused: allRows.filter((row) => row.status === "paused").length,
    pastDue: allRows.filter((row) => row.status === "past_due").length,
    monthlyRecurringCents: computeMonthlyRecurringCents(allRows),
  };

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Subscriptions" }]} />
      <SubscriptionsTable
        rows={pageItems}
        totalCount={totalCount}
        totalPages={totalPages}
        page={page}
        pageSize={PAGE_SIZE}
        totalSubscriptions={allRows.length}
        featureEnabled={featureEnabled}
        summary={summary}
      />
    </>
  );
}

export const metadata = {
  title: "Subscriptions",
};
