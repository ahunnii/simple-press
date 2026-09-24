import type { Prisma } from "generated/prisma";

import type {
  InvoiceListSort,
  InvoiceListSourceFilter,
  InvoiceListStatusFilter,
} from "~/lib/validators/invoice";
import { INVOICE_DEFAULT_NUMBER_PADDING } from "~/lib/validators/invoice";
import { QBO_OPEN_INVOICE_STATUSES } from "~/lib/validators/quickbooks";

import { formatInvoiceNumber, parseInvoiceNumberQuery } from "./number";
import { isInvoiceOverdue, todayUtcMidnight } from "./status";
import { balanceDueCents } from "./totals";

/**
 * One list, two sources: native `Invoice` rows and `QuickBooksInvoice` rows,
 * shown together on `/admin/invoices`. Client-safe (the Prisma import is
 * type-only).
 *
 * **Why the merge is correct.** Native rows are filtered, sorted and paged in
 * SQL; QuickBooks rows are loaded whole (capped at 1000) and filtered in
 * memory, because their customer fields are encrypted and can't be searched
 * in SQL. To produce page P of the merged order, `listUnified` takes the first
 * `P × pageSize` native rows (no skip) and ALL matching QuickBooks rows, sorts
 * them together with `compareUnifiedRows`, and slices out page P. Page P's
 * rows sit within the first `P × pageSize` of the merged order, which can
 * contain at most `P × pageSize` native rows — and those are exactly the
 * native top `P × pageSize`. That argument only holds if Postgres orders the
 * native rows EXACTLY as `compareUnifiedRows` does, which is why the SQL
 * ordering is built here too (`nativeInvoiceOrderBy`), next to the comparator
 * it must match, and why sorts whose SQL and JS orders can drift (customer
 * name collation) aren't offered.
 *
 * **Status vocabulary.** Each source's statuses map onto one unified set.
 * Overdue is a flag, not a status, computed with the same local-date rule for
 * both sources (`isInvoiceOverdue`).
 */

export const UNIFIED_INVOICE_PAGE_SIZE = 25;

export const UNIFIED_INVOICE_STATUS_VALUES = [
  "draft",
  "outstanding",
  "partially_paid",
  "paid",
  "cancelled",
  "pending",
  "error",
] as const;
export type UnifiedInvoiceStatus =
  (typeof UNIFIED_INVOICE_STATUS_VALUES)[number];

export const UNIFIED_INVOICE_STATUS_LABELS: Record<
  UnifiedInvoiceStatus,
  string
> = {
  draft: "Draft",
  outstanding: "Outstanding",
  partially_paid: "Partially paid",
  paid: "Paid",
  cancelled: "Cancelled",
  pending: "Pending",
  error: "Error",
};

export type UnifiedInvoiceSource = "native" | "quickbooks";

/**
 * QuickBooks-only fields the unified row doesn't otherwise carry, needed by
 * the per-row QuickBooks actions and cells (`qbo-invoice-row-actions.tsx`,
 * `invoices-client.tsx`). Present only when `source === "quickbooks"`.
 * `status` isn't repeated here — it's already `rawStatus` on the row.
 */
export type UnifiedInvoiceQboDetail = {
  kind: string;
  qboInvoiceId: string | null;
  lastError: string | null;
  /** The quote lead this invoice was raised against, if any (`onDelete: SetNull`). */
  lead: { id: string; contactName: string } | null;
};

export type UnifiedInvoiceRow = {
  source: UnifiedInvoiceSource;
  id: string;
  /** "INV-0012" for native rows; the QuickBooks doc number (or "—" before QBO assigns one). */
  displayNumber: string;
  customerName: string;
  customerEmail: string;
  totalCents: number;
  balanceCents: number;
  status: UnifiedInvoiceStatus;
  /** The source's own status string (`Invoice.status` / `QuickBooksInvoice.status`). */
  rawStatus: string;
  isOverdue: boolean;
  dueDate: Date | null;
  createdAt: Date;
  /** Admin detail page; `null` for QuickBooks rows, which have no detail page (their actions live on the row). */
  href: string | null;
  /** Set only for `source === "quickbooks"` rows. */
  qbo?: UnifiedInvoiceQboDetail;
};

// ─── Row mapping ────────────────────────────────────────────────────────────

/** The native columns the list needs — select exactly these. */
export type NativeInvoiceListRow = {
  id: string;
  invoiceNumber: number;
  numberPrefix: string;
  status: string;
  customerName: string;
  customerEmail: string;
  totalCents: number;
  amountPaidCents: number;
  dueDate: Date | null;
  createdAt: Date;
};

export const NATIVE_INVOICE_LIST_SELECT = {
  id: true,
  invoiceNumber: true,
  numberPrefix: true,
  status: true,
  customerName: true,
  customerEmail: true,
  totalCents: true,
  amountPaidCents: true,
  dueDate: true,
  createdAt: true,
} satisfies Prisma.InvoiceSelect;

const NATIVE_STATUS_MAP: Record<string, UnifiedInvoiceStatus> = {
  DRAFT: "draft",
  SENT: "outstanding",
  PARTIALLY_PAID: "partially_paid",
  PAID: "paid",
  CANCELLED: "cancelled",
};

/**
 * `numberPadding` is the business's CURRENT setting — padding isn't
 * snapshotted per invoice (see `~/lib/invoices/number`).
 */
export function mapNativeRow(
  row: NativeInvoiceListRow,
  now: Date,
  timeZone: string,
  numberPadding: number = INVOICE_DEFAULT_NUMBER_PADDING,
): UnifiedInvoiceRow {
  const status = NATIVE_STATUS_MAP[row.status] ?? "outstanding";
  return {
    source: "native",
    id: row.id,
    displayNumber: formatInvoiceNumber(
      row.numberPrefix,
      row.invoiceNumber,
      numberPadding,
    ),
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    totalCents: row.totalCents,
    // A cancelled invoice owes nothing, whatever was unpaid when it was cancelled.
    balanceCents: status === "cancelled" ? 0 : balanceDueCents(row),
    status,
    rawStatus: row.status,
    isOverdue: isInvoiceOverdue(row, now, timeZone),
    dueDate: row.dueDate,
    createdAt: row.createdAt,
    href: `/admin/invoices/${row.id}`,
  };
}

/** The QuickBooks columns the list needs — a subset of `listInvoices`' `INVOICE_LIST_SELECT`. */
export type QboInvoiceListRow = {
  id: string;
  createdAt: Date;
  amountCents: number;
  balanceCents: number | null;
  status: string;
  dueDate: Date | null;
  customerName: string;
  customerEmail: string;
  qboDocNumber: string | null;
  kind: string;
  qboInvoiceId: string | null;
  lastError: string | null;
  quoteSubmission: { id: string; contactName: string } | null;
};

const QBO_OPEN = new Set<string>(QBO_OPEN_INVOICE_STATUSES);

function qboUnifiedStatus(status: string): UnifiedInvoiceStatus {
  switch (status) {
    case "paid":
      return "paid";
    case "voided":
      return "cancelled";
    case "pending":
      return "pending";
    case "error":
      return "error";
    default:
      // created | sent | overdue (and anything unrecognized) — still owed.
      return "outstanding";
  }
}

/**
 * QuickBooks overdue uses the native rule on the stored due date rather than
 * trusting `status === "overdue"`, which is only as fresh as the last sync.
 * With no due date there is nothing to compute, so the synced status stands.
 */
function isQboOverdue(
  row: QboInvoiceListRow,
  now: Date,
  timeZone: string,
): boolean {
  if (!QBO_OPEN.has(row.status)) return false;
  if (!row.dueDate) return row.status === "overdue";
  return row.dueDate.getTime() < todayUtcMidnight(now, timeZone).getTime();
}

export function mapQboRow(
  row: QboInvoiceListRow,
  now: Date,
  timeZone: string,
): UnifiedInvoiceRow {
  const status = qboUnifiedStatus(row.status);
  let balanceCents: number;
  if (status === "paid" || status === "cancelled") balanceCents = 0;
  else balanceCents = Math.max(0, row.balanceCents ?? row.amountCents);

  return {
    source: "quickbooks",
    id: row.id,
    displayNumber: row.qboDocNumber ?? "—",
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    totalCents: row.amountCents,
    balanceCents,
    status,
    rawStatus: row.status,
    isOverdue: isQboOverdue(row, now, timeZone),
    dueDate: row.dueDate,
    createdAt: row.createdAt,
    href: null,
    qbo: {
      kind: row.kind,
      qboInvoiceId: row.qboInvoiceId,
      lastError: row.lastError,
      lead: row.quoteSubmission,
    },
  };
}

// ─── Filtering ──────────────────────────────────────────────────────────────

/**
 * The in-memory status filter (used for QuickBooks rows, and valid for native
 * rows too). Must agree with `nativeListStatusWhere`. QuickBooks
 * `pending`/`error` rows match only `all`.
 */
export function matchesListStatusFilter(
  row: Pick<UnifiedInvoiceRow, "status" | "isOverdue">,
  filter: InvoiceListStatusFilter,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "draft":
      return row.status === "draft";
    case "outstanding":
      return row.status === "outstanding" || row.status === "partially_paid";
    case "overdue":
      return row.isOverdue;
    case "paid":
      return row.status === "paid";
    case "cancelled":
      return row.status === "cancelled";
  }
}

export function matchesListSourceFilter(
  row: Pick<UnifiedInvoiceRow, "source">,
  filter: InvoiceListSourceFilter,
): boolean {
  return filter === "all" || row.source === filter;
}

/**
 * The in-memory search (QuickBooks rows): a case-insensitive substring of the
 * customer name, email, display number, or — for a QuickBooks row raised
 * against a quote lead — the lead's contact name (restores the search the old
 * QuickBooks-only page offered), OR the query parses as the same invoice
 * number ("#1043" finds doc number "1043"). Mirrors the native SQL search in
 * `nativeInvoiceSearchWhere` (native rows have no lead to search).
 */
export function matchesInvoiceSearch(
  row: Pick<
    UnifiedInvoiceRow,
    "displayNumber" | "customerName" | "customerEmail" | "qbo"
  >,
  search: string | null | undefined,
): boolean {
  const query = search?.trim().toLowerCase();
  if (!query) return true;
  if (
    row.customerName.toLowerCase().includes(query) ||
    row.customerEmail.toLowerCase().includes(query) ||
    row.displayNumber.toLowerCase().includes(query) ||
    (row.qbo?.lead?.contactName.toLowerCase().includes(query) ?? false)
  ) {
    return true;
  }
  const n = parseInvoiceNumberQuery(query);
  return n !== null && parseInvoiceNumberQuery(row.displayNumber) === n;
}

/** SQL twin of `matchesListStatusFilter` for native rows. */
export function nativeListStatusWhere(
  filter: InvoiceListStatusFilter,
  now: Date,
  timeZone: string,
): Prisma.InvoiceWhereInput {
  switch (filter) {
    case "all":
      return {};
    case "draft":
      return { status: "DRAFT" };
    case "outstanding":
      return { status: { in: ["SENT", "PARTIALLY_PAID"] } };
    case "overdue":
      // `lt` never matches NULL, so an invoice without a due date is never overdue.
      return {
        status: { in: ["SENT", "PARTIALLY_PAID"] },
        dueDate: { lt: todayUtcMidnight(now, timeZone) },
      };
    case "paid":
      return { status: "PAID" };
    case "cancelled":
      return { status: "CANCELLED" };
  }
}

/**
 * SQL search for native rows: name or email contains the query
 * (case-insensitive), OR the invoice number equals the parsed query.
 * `undefined` for an empty query, so it can be spread into an `AND`.
 */
export function nativeInvoiceSearchWhere(
  search: string | null | undefined,
): Prisma.InvoiceWhereInput | undefined {
  const query = search?.trim();
  if (!query) return undefined;
  const n = parseInvoiceNumberQuery(query);
  return {
    OR: [
      { customerName: { contains: query, mode: "insensitive" } },
      { customerEmail: { contains: query, mode: "insensitive" } },
      ...(n !== null ? [{ invoiceNumber: n }] : []),
    ],
  };
}

// ─── Sorting ────────────────────────────────────────────────────────────────

/**
 * Every sort breaks ties on `createdAt` (newest first, except `oldest`) and
 * then `id` ascending — the same chain `nativeInvoiceOrderBy` hands Postgres.
 * `due-asc` puts a null due date LAST ("no due date" is not "due soonest").
 */
export function compareUnifiedRows(
  sort: InvoiceListSort,
): (a: UnifiedInvoiceRow, b: UnifiedInvoiceRow) => number {
  const byId = (a: UnifiedInvoiceRow, b: UnifiedInvoiceRow) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  const newestFirst = (a: UnifiedInvoiceRow, b: UnifiedInvoiceRow) =>
    b.createdAt.getTime() - a.createdAt.getTime() || byId(a, b);

  switch (sort) {
    case "oldest":
      return (a, b) =>
        a.createdAt.getTime() - b.createdAt.getTime() || byId(a, b);
    case "due-asc":
      return (a, b) => {
        const aDue = a.dueDate?.getTime();
        const bDue = b.dueDate?.getTime();
        if (aDue === undefined || bDue === undefined) {
          if (aDue === bDue) return newestFirst(a, b);
          return aDue === undefined ? 1 : -1;
        }
        return aDue - bDue || newestFirst(a, b);
      };
    case "amount-desc":
      return (a, b) => b.totalCents - a.totalCents || newestFirst(a, b);
    case "amount-asc":
      return (a, b) => a.totalCents - b.totalCents || newestFirst(a, b);
    case "newest":
      return newestFirst;
  }
}

/** The Postgres ordering that matches `compareUnifiedRows(sort)` exactly for native rows. */
export function nativeInvoiceOrderBy(
  sort: InvoiceListSort,
): Prisma.InvoiceOrderByWithRelationInput[] {
  const tail: Prisma.InvoiceOrderByWithRelationInput[] = [
    { createdAt: "desc" },
    { id: "asc" },
  ];
  switch (sort) {
    case "oldest":
      return [{ createdAt: "asc" }, { id: "asc" }];
    case "due-asc":
      return [{ dueDate: { sort: "asc", nulls: "last" } }, ...tail];
    case "amount-desc":
      return [{ totalCents: "desc" }, ...tail];
    case "amount-asc":
      return [{ totalCents: "asc" }, ...tail];
    case "newest":
      return tail;
  }
}

// ─── Merge ──────────────────────────────────────────────────────────────────

/**
 * Page `page` (1-based) of the merged list. `nativeTop` must be the first
 * `page × pageSize` native matches in `nativeInvoiceOrderBy(sort)` order (no
 * skip); `qboMatches` every QuickBooks row that passed the filters. See the
 * header for why that is sufficient. The caller clamps `page` against
 * `nativeCount + qboMatches.length` first.
 */
export function mergeUnifiedPage(args: {
  nativeTop: readonly UnifiedInvoiceRow[];
  qboMatches: readonly UnifiedInvoiceRow[];
  page: number;
  pageSize: number;
  sort: InvoiceListSort;
}): UnifiedInvoiceRow[] {
  const { page, pageSize } = args;
  const start = (page - 1) * pageSize;
  return [...args.nativeTop, ...args.qboMatches]
    .sort(compareUnifiedRows(args.sort))
    .slice(start, start + pageSize);
}
