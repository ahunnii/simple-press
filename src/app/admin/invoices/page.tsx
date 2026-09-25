import { redirect } from "next/navigation";

import type { FilterDefFor } from "../_components/admin-filters";
import type { InvoiceListStatusFilter } from "~/lib/validators/invoice";
import type { QboDepositMode } from "~/lib/validators/quickbooks";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import {
  INVOICE_LIST_SORT_DEFAULT,
  INVOICE_LIST_SORT_LABELS,
  INVOICE_LIST_SORT_VALUES,
  INVOICE_LIST_SOURCE_FILTER_DEFAULT,
  INVOICE_LIST_SOURCE_FILTER_LABELS,
  INVOICE_LIST_SOURCE_FILTER_VALUES,
  INVOICE_LIST_STATUS_FILTER_DEFAULT,
  INVOICE_LIST_STATUS_FILTER_VALUES,
  INVOICE_SEARCH_MAX_LENGTH,
} from "~/lib/validators/invoice";
import { api } from "~/trpc/server";

import { TrailHeader } from "../_components/trail-header";
import {
  canonicalPageHref,
  parsePageParam,
  pickParam,
} from "../_lib/table-query";
import { InvoicesClient } from "./_components/invoices-client";

type Props = {
  searchParams: Promise<{
    search?: string;
    status?: string;
    source?: string;
    sort?: string;
    page?: string;
    new?: string;
    /** Retired QuickBooks-only filter — read by nothing, listed so old bookmarks type-check as known. */
    kind?: string;
  }>;
};

const BASE_PATH = "/admin/invoices";

/**
 * Fallback deposit rule / due-days when no `QuickBooksConnection` row exists
 * yet (the owner has never connected). Mirrors the column defaults on
 * `QuickBooksConnection` in prisma/schema.prisma (`depositMode: "percent"`,
 * `depositPercent: 25`, `depositFixedCents: 0`, `defaultDueDays: 7`) so the
 * QuickBooks "New invoice" dialog's due-date default is sensible even before
 * a connection row is created — the row itself is only created at OAuth
 * callback time.
 */
const DEFAULT_DEPOSIT_RULE = {
  depositMode: "percent" as const,
  depositPercent: 25,
  depositFixedCents: 0,
};
const DEFAULT_DUE_DAYS = 7;

/**
 * Bookmarks from the QuickBooks-only page used QuickBooks' own status
 * vocabulary. `paid` and `overdue` exist in both and pass straight through;
 * these three have an obvious unified home. `pending`/`error` have no tab (they
 * only appear under All), so they fall back to the default like any unknown
 * value.
 */
const LEGACY_QBO_STATUS: Record<string, InvoiceListStatusFilter> = {
  created: "outstanding",
  sent: "outstanding",
  voided: "cancelled",
};

// Pinned to the validator tuples `invoiceListParamsSchema` enforces — the same
// `FilterDefFor` contract every migrated admin table follows. Status is NOT
// here: it's the tab strip above the table, not a popover field.
const SOURCE_FILTER: FilterDefFor<typeof INVOICE_LIST_SOURCE_FILTER_VALUES> = {
  key: "source",
  label: "Source",
  defaultValue: INVOICE_LIST_SOURCE_FILTER_DEFAULT,
  options: [
    { value: "all", label: INVOICE_LIST_SOURCE_FILTER_LABELS.all },
    { value: "native", label: INVOICE_LIST_SOURCE_FILTER_LABELS.native },
    {
      value: "quickbooks",
      label: INVOICE_LIST_SOURCE_FILTER_LABELS.quickbooks,
    },
  ],
};

const SORT_FILTER: FilterDefFor<typeof INVOICE_LIST_SORT_VALUES> = {
  key: "sort",
  label: "Sort",
  defaultValue: INVOICE_LIST_SORT_DEFAULT,
  options: [
    { value: "newest", label: INVOICE_LIST_SORT_LABELS.newest },
    { value: "oldest", label: INVOICE_LIST_SORT_LABELS.oldest },
    { value: "due-asc", label: INVOICE_LIST_SORT_LABELS["due-asc"] },
    { value: "amount-desc", label: INVOICE_LIST_SORT_LABELS["amount-desc"] },
    { value: "amount-asc", label: INVOICE_LIST_SORT_LABELS["amount-asc"] },
  ],
};

/**
 * `QuickBooksConnection.depositMode` is a plain `String` column, narrowed the
 * same way the QuickBooks router narrows `status` — an unrecognized value
 * falls back to `"percent"`, the DB column default, rather than throwing.
 */
function toDepositMode(mode: string): QboDepositMode {
  return mode === "fixed" ? "fixed" : "percent";
}

export default async function AdminInvoicesPage({ searchParams }: Props) {
  const params = await searchParams;

  // No layout.tsx gates this subtree: the nav shows Invoices when EITHER the
  // `invoices` or the `quickbooks` flag is on, both are `ownerCanToggle`, and
  // every read here is ungated — turning a feature off disables its write
  // actions (threaded to the client as flags), never the records.

  // Whitelist everything going in. `pickParam` falls back rather than
  // throwing, so `?status=bogus` / `?sort=customer-asc` (a retired QuickBooks
  // sort) render the default view with no chip and no 500; `parsePageParam`
  // does the same for `?page=abc`. Search is clipped to the validator's max so
  // a pasted essay narrows instead of error-boundarying the page.
  const search = (params.search?.trim() ?? "").slice(
    0,
    INVOICE_SEARCH_MAX_LENGTH,
  );
  const status = pickParam(
    params.status !== undefined
      ? (LEGACY_QBO_STATUS[params.status] ?? params.status)
      : undefined,
    INVOICE_LIST_STATUS_FILTER_VALUES,
    INVOICE_LIST_STATUS_FILTER_DEFAULT,
  );
  const source = pickParam(
    params.source,
    INVOICE_LIST_SOURCE_FILTER_VALUES,
    INVOICE_LIST_SOURCE_FILTER_DEFAULT,
  );
  const sort = pickParam(
    params.sort,
    INVOICE_LIST_SORT_VALUES,
    INVOICE_LIST_SORT_DEFAULT,
  );
  const requestedPage = parsePageParam(params.page) ?? 1;
  const openNew = params.new === "1";

  const [list, summary, connectionData] = await Promise.all([
    api.invoice
      .listUnified({
        search: search || undefined,
        status,
        source,
        sort,
        page: requestedPage,
      })
      .catch(rethrowTrpcForErrorBoundary),
    api.invoice.summary().catch(rethrowTrpcForErrorBoundary),
    api.quickbooks.getConnection().catch(rethrowTrpcForErrorBoundary),
  ]);

  // Put the URL back in step with the page the router clamped to — see
  // `canonicalPageHref`. Before the render, because `redirect` throws.
  const canonicalHref = canonicalPageHref(BASE_PATH, params, list.page);
  if (canonicalHref) redirect(canonicalHref);

  // `sort` and `page` are excluded: neither changes WHICH invoices match.
  const filtersNarrow = search !== "" || status !== "all" || source !== "all";

  // "No invoices yet" vs "no matches" — `listUnified` computes this ignoring
  // every filter, so no second round trip is needed here.
  const hasAnyInvoices = list.hasAnyInvoices;

  // `UnifiedInvoiceRow.qbo` now carries the QuickBooks-only fields the row
  // actions and cells need (Intuit id for Refresh / Open in QuickBooks,
  // `lastError`, kind, linked lead) straight from `listUnified` — no second
  // `quickbooks.listInvoices` call.
  const qboListCap = list.qboListCap;

  const { connection } = connectionData;

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Invoices" }]} />
      <InvoicesClient
        rows={list.rows}
        qboListCap={qboListCap}
        totalCount={list.totalCount}
        page={list.page}
        pageCount={list.pageCount}
        pageSize={list.pageSize}
        status={status}
        hasAnyInvoices={hasAnyInvoices}
        filtersNarrow={filtersNarrow}
        filters={
          // The source filter only means something once QuickBooks rows
          // exist — but stays while a `?source=` is applied, so its chip can
          // still be removed.
          list.hasQboRows || source !== "all"
            ? [SOURCE_FILTER, SORT_FILTER]
            : [SORT_FILTER]
        }
        hasQboRows={list.hasQboRows}
        invoicesEnabled={list.invoicesEnabled}
        qboEnabled={list.qboEnabled}
        summary={summary}
        timeZone={list.timeZone}
        connection={connection}
        environment={connectionData.environment}
        platformConfigured={connectionData.platformConfigured}
        openNew={openNew}
        defaultDueDays={connection?.defaultDueDays ?? DEFAULT_DUE_DAYS}
        depositRule={
          connection
            ? {
                depositMode: toDepositMode(connection.depositMode),
                depositPercent: connection.depositPercent,
                depositFixedCents: connection.depositFixedCents,
              }
            : DEFAULT_DEPOSIT_RULE
        }
      />
    </>
  );
}

export const metadata = {
  title: "Invoices",
};
