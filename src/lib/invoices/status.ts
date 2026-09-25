import type { InvoiceDueTerms, InvoiceStatus } from "~/lib/validators/invoice";
import { addCalendarDays, zonedCalendarDate } from "~/lib/calendar-date";
import {
  INVOICE_DUE_TERMS_DAYS,
  INVOICE_STATUS_VALUES,
} from "~/lib/validators/invoice";

import { balanceDueCents } from "./totals";

/**
 * Invoice lifecycle rules — pure, client-safe, shared by the router (which
 * enforces them) and the admin UI (which disables buttons with them). Keeping
 * one copy is the point: a button that is enabled for an action the router
 * then refuses is a bug report waiting to happen.
 *
 * **Dates.** `issueDate`, `dueDate` and `InvoicePayment.paidOn` are CALENDAR
 * dates stored as UTC midnight of that date — the convention QuickBooks rows
 * already use (`new Date(\`${ymd}T00:00:00Z\`)` in the quickbooks router and
 * sync). So the stored instant is only ever compared against another UTC
 * midnight (`todayUtcMidnight`), never against `now` directly: 23:30 in
 * Detroit on the due date is still "due today", not overdue, even though it is
 * already the next day in UTC.
 */

/** How long after a reminder the owner must wait to send another. */
export const REMINDER_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** The statuses that are sent and still owe money. */
const OPEN_STATUSES: readonly InvoiceStatus[] = ["SENT", "PARTIALLY_PAID"];

export function isOpenInvoiceStatus(status: string): boolean {
  return (OPEN_STATUSES as readonly string[]).includes(status);
}

/**
 * Narrows the plain-`String` `Invoice.status` column. Every write validates
 * against `INVOICE_STATUS_VALUES`, so an unknown value can only be hand-edited
 * data; it reads as `SENT` — an open invoice that can still be paid or
 * cancelled — rather than `DRAFT` (editable and deletable, the dangerous
 * choice for what may be a real bill) or `CANCELLED` (which would lock out
 * recording money received).
 */
export function toInvoiceStatus(raw: string): InvoiceStatus {
  return (INVOICE_STATUS_VALUES as readonly string[]).includes(raw)
    ? (raw as InvoiceStatus)
    : "SENT";
}

/**
 * The status after a payment write. `DRAFT` and `CANCELLED` are sticky — a
 * payment can't move an invoice out of either (the router refuses to record
 * one on a draft; a cancelled invoice keeps its recorded payments as history).
 * Otherwise it follows the money: fully paid → `PAID`, anything paid →
 * `PARTIALLY_PAID`, nothing → `SENT` (which is how deleting the only payment
 * walks a paid invoice back).
 */
export function deriveInvoiceStatus(invoice: {
  status: InvoiceStatus;
  totalCents: number;
  amountPaidCents: number;
}): InvoiceStatus {
  if (invoice.status === "DRAFT" || invoice.status === "CANCELLED") {
    return invoice.status;
  }
  if (
    invoice.amountPaidCents > 0 &&
    invoice.amountPaidCents >= invoice.totalCents
  ) {
    return "PAID";
  }
  if (invoice.amountPaidCents > 0) return "PARTIALLY_PAID";
  return "SENT";
}

/** `YYYY-MM-DD` → the UTC-midnight instant it is stored as. */
export function ymdToUtcMidnight(ymd: string): Date {
  return new Date(`${ymd}T00:00:00Z`);
}

/** The inverse of `ymdToUtcMidnight` — a stored calendar date back to `YYYY-MM-DD`. */
export function utcMidnightToYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Today's date in the business's zone, as the UTC-midnight instant a stored
 * calendar date is compared against. An invalid zone falls back to UTC (see
 * `zonedCalendarDate`).
 */
export function todayUtcMidnight(now: Date, timeZone: string): Date {
  return ymdToUtcMidnight(zonedCalendarDate(now, timeZone));
}

/**
 * Past due: still owed (`SENT`/`PARTIALLY_PAID`) and the due date is BEFORE
 * today in the business's zone. The due date itself is not overdue — "due
 * 9/30" means the customer has all of 9/30. The same rule backs the
 * `overdue` list filter (`nativeListStatusWhere`) and the owner alert cron.
 */
export function isInvoiceOverdue(
  invoice: { status: string; dueDate: Date | null },
  now: Date,
  timeZone: string,
): boolean {
  if (!isOpenInvoiceStatus(invoice.status) || !invoice.dueDate) return false;
  return invoice.dueDate.getTime() < todayUtcMidnight(now, timeZone).getTime();
}

/**
 * The due date for `terms`, counted from `issueYmd` (both `YYYY-MM-DD`).
 * `custom` returns `customYmd` as-is, or `null` when it is missing — the draft
 * validator requires it, so `null` only reaches a caller holding bad data.
 */
export function resolveDueDateYmd(
  terms: InvoiceDueTerms,
  issueYmd: string,
  customYmd?: string | null,
): string | null {
  if (terms === "custom") return customYmd ?? null;
  return addCalendarDays(issueYmd, INVOICE_DUE_TERMS_DAYS[terms]);
}

export type InvoiceCapabilities = {
  canEdit: boolean;
  canSend: boolean;
  canRecordPayment: boolean;
  canCancel: boolean;
  canDelete: boolean;
  canRemind: boolean;
  /** When the reminder cooldown ends, while it is running; otherwise `null`. */
  remindAvailableAt: Date | null;
};

/**
 * What can be done to an invoice right now, by status alone. The `invoices`
 * feature flag is layered on top by the caller (it blocks edit/send/remind/
 * delete but never payments or cancel — see the router), so it is not an
 * input here.
 *
 * - Edit / delete: drafts only. A sent invoice is changed by cancelling it and
 *   issuing a new one.
 * - Send: drafts with a non-zero total (a $0 invoice asks for nothing).
 * - Record payment: open invoices with a balance left.
 * - Cancel: open invoices. A fully paid invoice is a closed record.
 * - Remind: open invoices, at most once per `REMINDER_COOLDOWN_MS`.
 */
export function invoiceCapabilities(
  invoice: {
    status: string;
    totalCents: number;
    amountPaidCents: number;
    lastReminderSentAt: Date | null;
  },
  now: Date,
): InvoiceCapabilities {
  const isDraft = invoice.status === "DRAFT";
  const isOpen = isOpenInvoiceStatus(invoice.status);

  let remindAvailableAt: Date | null = null;
  if (isOpen && invoice.lastReminderSentAt) {
    const availableAt =
      invoice.lastReminderSentAt.getTime() + REMINDER_COOLDOWN_MS;
    if (now.getTime() < availableAt) remindAvailableAt = new Date(availableAt);
  }

  return {
    canEdit: isDraft,
    canSend: isDraft && invoice.totalCents > 0,
    canRecordPayment: isOpen && balanceDueCents(invoice) > 0,
    canCancel: isOpen,
    canDelete: isDraft,
    canRemind: isOpen && remindAvailableAt === null,
    remindAvailableAt,
  };
}
