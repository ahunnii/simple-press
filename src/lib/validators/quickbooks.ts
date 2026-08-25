import { z } from "zod";

import { QUOTE_MAX_FINAL_CENTS } from "~/lib/validators/quote-calculator";

/**
 * Schemas and enums for the QuickBooks Online (QBO) invoicing integration.
 *
 * Mirrors the conventions in `quote-calculator.ts`: a tuple constant is the
 * one source of truth for each string union, a label map renders it for
 * owner-facing UI, and the local domain types in
 * `src/lib/quickbooks/types.ts` are DERIVED from these tuples (via
 * `(typeof X)[number]`) rather than hand-duplicated — this file owns the
 * unions, `types.ts` just imports the resulting types under shorter names.
 */

// ─── Invoice kind ───────────────────────────────────────────────────────────

/**
 * What an invoice was raised for. `deposit`/`final` are generated from the
 * quote-calculator flow (a deposit against an estimate, then the balance);
 * `custom` is a one-off the owner creates by hand from the admin inbox.
 */
export const QBO_INVOICE_KIND_VALUES = ["deposit", "final", "custom"] as const;
export type QboInvoiceKind = (typeof QBO_INVOICE_KIND_VALUES)[number];

export const QBO_INVOICE_KIND_LABELS: Record<QboInvoiceKind, string> = {
  deposit: "Deposit",
  final: "Final",
  custom: "Custom",
};

// ─── Invoice status ─────────────────────────────────────────────────────────

/**
 * Local lifecycle status for a synced invoice. `pending` = queued locally,
 * not yet written to QBO; `error` = the QBO write/sync itself failed. The
 * rest track what QBO reports back — see `deriveInvoiceStatus` in
 * `src/lib/quickbooks/mapping.ts` for how a poll result maps to one of these.
 */
export const QBO_INVOICE_STATUS_VALUES = [
  "pending",
  "created",
  "sent",
  "paid",
  "overdue",
  "voided",
  "error",
] as const;
export type QboInvoiceStatus = (typeof QBO_INVOICE_STATUS_VALUES)[number];

export const QBO_INVOICE_STATUS_LABELS: Record<QboInvoiceStatus, string> = {
  pending: "Pending",
  created: "Created",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
  voided: "Voided",
  error: "Error",
};

/**
 * The statuses considered still "open" — the set the sync cron re-polls
 * against QBO looking for a payment, a bounced due date, or a void. `pending`
 * and `error` are excluded (nothing has been created in QBO yet to poll) and
 * `paid`/`voided` are terminal.
 */
export const QBO_OPEN_INVOICE_STATUSES = [
  "created",
  "sent",
  "overdue",
] as const;
export type QboOpenInvoiceStatus = (typeof QBO_OPEN_INVOICE_STATUSES)[number];

// ─── Admin inbox filters / sort ─────────────────────────────────────────────

/**
 * The `/admin/invoices` param vocabulary — one `as const` tuple plus a
 * `_DEFAULT` per param, the shape `docs/admin-table-migration.md` §4 requires
 * of every migrated list.
 *
 * `listInvoices` is input-free (the page filters, sorts and paginates in
 * memory via `buildTablePage`), so there is no router `z.enum` to keep in step
 * here — mirroring Discounts. The two halves that must agree are the page's
 * `pickParam` calls and the `FilterDefFor` option lists that render the
 * dropdowns, and both failure modes are **silent** rather than loud:
 *
 * - An option the dropdown offers that isn't in the tuple falls back to the
 *   default in `pickParam`, so the control looks selected while doing nothing.
 * - A tuple value with no matching `case` in `compareInvoiceRows` (or in the
 *   page's filter predicate) falls through to that switch's `default`, so a
 *   typo quietly reverts to "Newest first" instead of surfacing.
 *
 * Tuple order is menu order — `FilterDefFor` maps each tuple positionally onto
 * the dropdown's option list, so reordering here reorders the menu.
 */

export const QBO_INVOICE_STATUS_FILTER_VALUES = [
  "all",
  ...QBO_INVOICE_STATUS_VALUES,
] as const;
export const QBO_INVOICE_STATUS_FILTER_DEFAULT = "all";
export type QboInvoiceStatusFilterValue =
  (typeof QBO_INVOICE_STATUS_FILTER_VALUES)[number];

export const QBO_INVOICE_KIND_FILTER_VALUES = [
  "all",
  ...QBO_INVOICE_KIND_VALUES,
] as const;
export const QBO_INVOICE_KIND_FILTER_DEFAULT = "all";
export type QboInvoiceKindFilterValue =
  (typeof QBO_INVOICE_KIND_FILTER_VALUES)[number];

export const QBO_INVOICE_SORT_VALUES = [
  "newest",
  "oldest",
  "customer-asc",
  "customer-desc",
  "amount-desc",
  "amount-asc",
  "due-asc",
] as const;
export const QBO_INVOICE_SORT_DEFAULT = "newest";
export type QboInvoiceSortValue = (typeof QBO_INVOICE_SORT_VALUES)[number];

/**
 * The row fields `/admin/invoices` sorts on. Structural, so the richer row the
 * page actually holds satisfies it — including `buildTablePage`'s
 * `Omit<Row, "id">`, which is precisely why `id` is absent below.
 */
export type InvoiceSortRow = {
  customerName: string;
  amountCents: number;
  dueDate: Date | null;
  createdAt: Date;
};

/**
 * The PRIMARY ordering for the Invoices table — everything except the `id`
 * tie-break, which `buildTablePage` always appends itself (see
 * `PrimaryOrdering` in `src/app/admin/_lib/table-query.ts`: reaching for
 * `a.id` in here is deliberately a type error).
 *
 * It lives in this file rather than as a `switch` inside the page's
 * `comparePrimary` — the shape Collections/Inventory use — so the sort
 * vocabulary and the code that implements it sit next to each other and can be
 * unit-tested without rendering an RSC. Same placement Pages/Blog chose for
 * `comparePageListRows`.
 *
 * Two rules worth stating:
 *
 * - **`due-asc` puts a null due date LAST.** `createInvoice` always writes one,
 *   but the column is nullable (a QBO-side sync can clear it), and "no due
 *   date" is emphatically not "due soonest". Same nulls-last treatment
 *   `comparePageListRows` gives an unpublished row.
 * - **Ties fall to `createdAt` descending, not to the `id` tie-break.** Two
 *   invoices for the same customer, or the same amount, or the same due date
 *   are routine on this table; letting those reach the id tie-break orders
 *   them by cuid, which reads as random. Newest-first is the order the default
 *   sort already trained the owner to expect.
 *
 * `localeCompare` (not `<`) is what makes the customer sorts case-insensitive:
 * case is a tertiary collation difference, so "alice" precedes "Bob" — whereas
 * a code-unit comparison would put every capitalized name ahead of every
 * lowercase one.
 */
export function compareInvoiceRows(
  sort: QboInvoiceSortValue,
  a: InvoiceSortRow,
  b: InvoiceSortRow,
): number {
  const newestFirst = b.createdAt.getTime() - a.createdAt.getTime();

  switch (sort) {
    case "oldest":
      return a.createdAt.getTime() - b.createdAt.getTime();
    case "customer-asc":
      return a.customerName.localeCompare(b.customerName) || newestFirst;
    case "customer-desc":
      return b.customerName.localeCompare(a.customerName) || newestFirst;
    case "amount-desc":
      return b.amountCents - a.amountCents || newestFirst;
    case "amount-asc":
      return a.amountCents - b.amountCents || newestFirst;
    case "due-asc": {
      const aDue = a.dueDate?.getTime();
      const bDue = b.dueDate?.getTime();
      if (aDue === undefined || bDue === undefined) {
        // Nulls last. Both null → fall through to the shared tie-break rather
        // than returning a bare 0, so the id tie-break stays a last resort.
        if (aDue === bDue) return newestFirst;
        return aDue === undefined ? 1 : -1;
      }
      return aDue - bDue || newestFirst;
    }
    case "newest":
    default:
      // Matches QBO_INVOICE_SORT_DEFAULT.
      return newestFirst;
  }
}

// ─── Connection status ──────────────────────────────────────────────────────

/**
 * `active` — a stored, working connection. `needs_reconnect` — a connection
 * exists but its refresh token was rejected (expired/revoked at Intuit's
 * side) and the owner must re-authorize. `disconnected` — no connection has
 * ever been made, or the owner explicitly disconnected.
 */
export const QBO_CONNECTION_STATUS_VALUES = [
  "active",
  "needs_reconnect",
  "disconnected",
] as const;
export type QboConnectionStatus = (typeof QBO_CONNECTION_STATUS_VALUES)[number];

// ─── Deposit rule ───────────────────────────────────────────────────────────

/**
 * How the deposit invoice amount is derived from a quote estimate:
 * `percent` of the estimate, or a `fixed` cents amount (clamped to the
 * estimate — see `computeDepositCents`).
 */
export const QBO_DEPOSIT_MODE_VALUES = ["percent", "fixed"] as const;
export type QboDepositMode = (typeof QBO_DEPOSIT_MODE_VALUES)[number];

// ─── Field length limits ────────────────────────────────────────────────────

export const QBO_MAX_MEMO_LENGTH = 1000;
export const QBO_MAX_DESCRIPTION_LENGTH = 200;
export const QBO_MAX_NAME_LENGTH = 100;

// ─── Settings ────────────────────────────────────────────────────────────

/**
 * Owner-configured invoicing defaults, stored per business. `depositPercent`
 * and `depositFixedCents` are both always present and validated regardless of
 * `depositMode` — only the active mode's value is used at compute time (see
 * `computeDepositCents`), so switching modes back and forth never loses the
 * other value.
 */
export const quickBooksSettingsSchema = z.object({
  depositMode: z.enum(QBO_DEPOSIT_MODE_VALUES),
  depositPercent: z.number().int().min(1).max(100),
  depositFixedCents: z.number().int().min(0).max(QUOTE_MAX_FINAL_CENTS),
  defaultDueDays: z.number().int().min(0).max(90),
});
export type QuickBooksSettingsInput = z.infer<typeof quickBooksSettingsSchema>;

// ─── Create invoice ──────────────────────────────────────────────────────

/**
 * Input to the `quickbooks.createInvoice` mutation. `quoteSubmissionId` is
 * omitted for a `custom` invoice raised by hand from the admin inbox with no
 * originating quote lead.
 */
export const quickBooksCreateInvoiceSchema = z.object({
  quoteSubmissionId: z.string().min(1).optional(),
  kind: z.enum(QBO_INVOICE_KIND_VALUES),
  amountCents: z.number().int().min(1).max(QUOTE_MAX_FINAL_CENTS),
  customerName: z.string().trim().min(1).max(QBO_MAX_NAME_LENGTH),
  customerEmail: z.string().trim().email().max(254),
  customerPhone: z.string().trim().max(40).optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .refine((value) => {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
      if (!match) return false;
      const [, yearStr, monthStr, dayStr] = match;
      const y = Number(yearStr);
      const m = Number(monthStr);
      const d = Number(dayStr);
      const date = new Date(Date.UTC(y, m - 1, d));
      return (
        date.getUTCFullYear() === y &&
        date.getUTCMonth() === m - 1 &&
        date.getUTCDate() === d
      );
    }, "Enter a real calendar date"),
  description: z.string().trim().max(QBO_MAX_DESCRIPTION_LENGTH).optional(),
  memo: z.string().trim().max(QBO_MAX_MEMO_LENGTH).optional(),
  send: z.boolean().default(true),
});
export type QuickBooksCreateInvoiceInput = z.infer<
  typeof quickBooksCreateInvoiceSchema
>;

export const quickBooksInvoiceIdSchema = z.object({
  id: z.string().min(1),
});
