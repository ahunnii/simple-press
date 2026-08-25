import type { FilterDefFor } from "../_components/admin-filters";
import type { QboDepositMode } from "~/lib/validators/quickbooks";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import {
  compareInvoiceRows,
  QBO_INVOICE_KIND_FILTER_DEFAULT,
  QBO_INVOICE_KIND_FILTER_VALUES,
  QBO_INVOICE_KIND_LABELS,
  QBO_INVOICE_SORT_DEFAULT,
  QBO_INVOICE_SORT_VALUES,
  QBO_INVOICE_STATUS_FILTER_DEFAULT,
  QBO_INVOICE_STATUS_FILTER_VALUES,
  QBO_INVOICE_STATUS_LABELS,
} from "~/lib/validators/quickbooks";
import { api } from "~/trpc/server";

import { TrailHeader } from "../_components/trail-header";
import {
  buildTablePage,
  matchesAllTokens,
  pickParam,
} from "../_lib/table-query";
import { InvoicesClient } from "./_components/invoices-client";

type Props = {
  searchParams: Promise<{
    search?: string;
    status?: string;
    kind?: string;
    sort?: string;
    page?: string;
    new?: string;
  }>;
};

/** Rows per page — the platform standard (docs/admin-table-migration.md §2). */
const PAGE_SIZE = 25;

/**
 * Fallback deposit rule / due-days when no `QuickBooksConnection` row exists
 * yet (the owner has never connected). Mirrors the column defaults on
 * `QuickBooksConnection` in prisma/schema.prisma (`depositMode: "percent"`,
 * `depositPercent: 25`, `depositFixedCents: 0`, `defaultDueDays: 7`) so the
 * "New invoice" dialog's due-date default is sensible even before a
 * connection row is created — the row itself is only created at OAuth
 * callback time.
 */
const DEFAULT_DEPOSIT_RULE = {
  depositMode: "percent" as const,
  depositPercent: 25,
  depositFixedCents: 0,
};
const DEFAULT_DUE_DAYS = 7;

// Pinned to the validator tuples in `~/lib/validators/quickbooks` — same
// contract `STATUS_FILTER`/`SORT_FILTER` follow on the Quotes page.
const STATUS_FILTER: FilterDefFor<typeof QBO_INVOICE_STATUS_FILTER_VALUES> = {
  key: "status",
  label: "Status",
  defaultValue: QBO_INVOICE_STATUS_FILTER_DEFAULT,
  options: [
    { value: "all", label: "Any status" },
    { value: "pending", label: QBO_INVOICE_STATUS_LABELS.pending },
    { value: "created", label: QBO_INVOICE_STATUS_LABELS.created },
    { value: "sent", label: QBO_INVOICE_STATUS_LABELS.sent },
    { value: "paid", label: QBO_INVOICE_STATUS_LABELS.paid },
    { value: "overdue", label: QBO_INVOICE_STATUS_LABELS.overdue },
    { value: "voided", label: QBO_INVOICE_STATUS_LABELS.voided },
    { value: "error", label: QBO_INVOICE_STATUS_LABELS.error },
  ],
};

const KIND_FILTER: FilterDefFor<typeof QBO_INVOICE_KIND_FILTER_VALUES> = {
  key: "kind",
  label: "Kind",
  defaultValue: QBO_INVOICE_KIND_FILTER_DEFAULT,
  options: [
    { value: "all", label: "Any kind" },
    { value: "deposit", label: QBO_INVOICE_KIND_LABELS.deposit },
    { value: "final", label: QBO_INVOICE_KIND_LABELS.final },
    { value: "custom", label: QBO_INVOICE_KIND_LABELS.custom },
  ],
};

/**
 * Newest/oldest key on `createdAt`, which is exactly what the table's Created
 * column renders — the playbook's "one Date column = the sort key" rule. Due
 * stays as a SECOND date column rather than being folded in: it is a distinct,
 * owner-meaningful field (when the money is expected, not when the record was
 * made) and it has its own sort. That's the Orders-style exception, stated
 * here so the next reader doesn't "fix" it by deleting a column.
 *
 * Customer A–Z / Z–A are the "always include name asc/desc" pair from §7,
 * spelled `customer-*` because an invoice's name is its customer's.
 */
const SORT_FILTER: FilterDefFor<typeof QBO_INVOICE_SORT_VALUES> = {
  key: "sort",
  label: "Sort",
  defaultValue: QBO_INVOICE_SORT_DEFAULT,
  options: [
    { value: "newest", label: "Newest first" },
    { value: "oldest", label: "Oldest first" },
    { value: "customer-asc", label: "Customer A–Z" },
    { value: "customer-desc", label: "Customer Z–A" },
    { value: "amount-desc", label: "Highest amount" },
    { value: "amount-asc", label: "Lowest amount" },
    { value: "due-asc", label: "Due soonest" },
  ],
};

/**
 * `QuickBooksConnection.depositMode` is a plain `String` column (see the
 * schema comment on that field), narrowed here the same way `toInvoiceStatus`
 * narrows `status` in the router — an unrecognized value falls back to
 * `"percent"`, the DB column default, rather than throwing.
 */
function toDepositMode(mode: string): QboDepositMode {
  return mode === "fixed" ? "fixed" : "percent";
}

export default async function AdminInvoicesPage({ searchParams }: Props) {
  const params = await searchParams;

  // No layout.tsx gates this subtree — `quickbooks` is `ownerCanToggle: true`,
  // so the page (and the read procedures it calls) must stay reachable while
  // the flag is off, same as `/admin/quotes`. `featureEnabled` is threaded
  // through to the client to disable write actions instead.
  const flags = await getBusinessFlags();
  const featureEnabled = flags.isEnabled("quickbooks");

  const [connectionData, { rows: allRows, totalCount: lifetimeTotal }] =
    await Promise.all([
      api.quickbooks.getConnection().catch(rethrowTrpcForErrorBoundary),
      api.quickbooks.listInvoices().catch(rethrowTrpcForErrorBoundary),
    ]);

  // Whitelist everything going in. `pickParam` falls back rather than
  // throwing, so `?status=bogus` / `?sort=bogus` render the default view with
  // no chip and no 500; `buildTablePage` does the same for `?page=abc` and
  // clamps an over-range `?page=` onto the last real page.
  const search = params.search?.trim() ?? "";
  const status = pickParam(
    params.status,
    QBO_INVOICE_STATUS_FILTER_VALUES,
    QBO_INVOICE_STATUS_FILTER_DEFAULT,
  );
  const kind = pickParam(
    params.kind,
    QBO_INVOICE_KIND_FILTER_VALUES,
    QBO_INVOICE_KIND_FILTER_DEFAULT,
  );
  const sort = pickParam(
    params.sort,
    QBO_INVOICE_SORT_VALUES,
    QBO_INVOICE_SORT_DEFAULT,
  );
  const openNew = params.new === "1";

  const matching = allRows.filter((row) => {
    // Exactly the four strings a row puts on screen: the customer name and
    // email in the identity cell, the QuickBooks document number under them,
    // and the linked lead's contact name in the Lead column. Tokenized, so
    // "acme deposit" can match across two of them — and named in the client's
    // `searchAriaLabel`, per §5b.
    const matchesSearch = matchesAllTokens(search, [
      row.customerName,
      row.customerEmail,
      row.qboDocNumber,
      row.quoteSubmission?.contactName,
    ]);
    const matchesStatus = status === "all" || row.status === status;
    const matchesKind = kind === "all" || row.kind === kind;
    return matchesSearch && matchesStatus && matchesKind;
  });

  // `compareInvoiceRows` lives in the validators file next to the sort tuple it
  // switches on, so the two can't drift and the ordering is unit-testable
  // without an RSC render (Pages/Blog precedent). `buildTablePage` appends the
  // `id` tie-break that keeps pagination stable.
  const { pageItems, totalCount, totalPages, page } = buildTablePage(matching, {
    pageParam: params.page,
    pageSize: PAGE_SIZE,
    comparePrimary: (a, b) => compareInvoiceRows(sort, a, b),
  });

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Invoices" }]} />
      <InvoicesClient
        connection={connectionData.connection}
        environment={connectionData.environment}
        timeZone={connectionData.timeZone}
        featureEnabled={featureEnabled}
        rows={pageItems}
        totalCount={totalCount}
        totalPages={totalPages}
        page={page}
        pageSize={PAGE_SIZE}
        lifetimeTotal={lifetimeTotal}
        totalInvoices={allRows.length}
        filters={[STATUS_FILTER, KIND_FILTER, SORT_FILTER]}
        openNew={openNew}
        defaultDueDays={
          connectionData.connection?.defaultDueDays ?? DEFAULT_DUE_DAYS
        }
        depositRule={
          connectionData.connection
            ? {
                depositMode: toDepositMode(
                  connectionData.connection.depositMode,
                ),
                depositPercent: connectionData.connection.depositPercent,
                depositFixedCents: connectionData.connection.depositFixedCents,
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
