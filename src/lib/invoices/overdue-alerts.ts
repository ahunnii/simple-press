import "server-only";

import { createHash } from "crypto";
import * as Sentry from "@sentry/nextjs";

import type { OverdueInvoiceRow } from "~/emails/invoice-overdue-owner";
import type { DbClient } from "~/server/db";
import { sendInvoiceOverdueOwnerAlert } from "~/lib/email/templates";
import { resolveFlags } from "~/lib/features/resolve-flags";
import { INVOICE_OPEN_STATUSES } from "~/lib/validators/invoice";

import { logInvoiceEvent } from "./events";
import {
  adminInvoicesListUrl,
  adminInvoiceUrl,
  formatInvoiceDateLabel,
  INVOICE_NOTIFY_BUSINESS_SELECT,
  invoiceDisplayNumber,
} from "./notify";
import { DEFAULT_INVOICE_SETTINGS } from "./repository";
import { isInvoiceOverdue, todayUtcMidnight } from "./status";
import { balanceDueCents } from "./totals";

/**
 * The owner overdue-invoice alert — the cron job that emails an owner the
 * moment (well, the next ~15-minute tick) one of their invoices goes past
 * due, and stamps `Invoice.overdueNotifiedAt` so it never fires twice.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WHY A COARSE SQL FILTER PLUS AN EXACT PER-BUSINESS CHECK
 * ────────────────────────────────────────────────────────────────────────────
 * "Overdue" is a calendar judgement in the BUSINESS's time zone
 * (`isInvoiceOverdue` / `todayUtcMidnight`), not a plain `dueDate < now`
 * comparison — a Detroit invoice due today is not overdue at 11pm UTC just
 * because UTC has already rolled to tomorrow, and a Kiritimati (UTC+14) store
 * can consider an invoice overdue before UTC has even reached the due date's
 * midnight. SQL can't express "today in an arbitrary IANA zone" as a WHERE
 * clause, so the query below only narrows to `dueDate < now` (real time) —
 * a safe over-fetch, never an under-fetch, because a due date can never be
 * exactly-overdue in some zone before it is also `< now` in UTC. The per-
 * business loop then re-checks with `isInvoiceOverdue` and only acts on rows
 * that are genuinely overdue in that business's own zone; the rest sit
 * untouched (not stamped) for a later tick to pick up once they truly are.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * SILENT VS. EMAILED STAMPS
 * ────────────────────────────────────────────────────────────────────────────
 * Every genuinely-overdue invoice gets `overdueNotifiedAt` stamped exactly
 * once, but not every one earns an email:
 * - Alerts are OFF for the business (`InvoiceSettings.overdueAlertsEnabled`):
 *   stamped silently. The owner turned this off on purpose.
 * - The invoice is more than `OVERDUE_ALERT_MAX_AGE_DAYS` (7) days overdue:
 *   stamped silently. Otherwise a business that just turned the feature on
 *   (or a backlog from before this job existed) would blast the owner with a
 *   burst of alerts about invoices they already know are late.
 * Everything else goes into ONE email per business, and — like the cron's
 * `notifyBackInStock` — the stamp and the `OVERDUE_ALERTED` event are only
 * written when the send actually succeeds, so a failed send retries on the
 * next tick instead of being silently swallowed.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ISOLATION
 * ────────────────────────────────────────────────────────────────────────────
 * Each business is processed inside its own try/catch — one tenant's bad row
 * or a transient DB error must never cost every other tenant in the same
 * batch its overdue sweep. A business whose `invoices` flag is off is skipped
 * WITHOUT any write, so re-enabling the feature takes effect on the very
 * next tick rather than waiting out a stamp that never should have happened.
 */

/** How many overdue invoices one run will consider, oldest due date first. */
const OVERDUE_ALERT_BATCH = 500;

/** Past this many days overdue, a newly-overdue invoice is stamped silently. */
const OVERDUE_ALERT_MAX_AGE_DAYS = 7;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** The plaintext columns the sweep needs from a candidate invoice. */
const OVERDUE_CANDIDATE_SELECT = {
  id: true,
  businessId: true,
  invoiceNumber: true,
  numberPrefix: true,
  status: true,
  customerName: true,
  totalCents: true,
  amountPaidCents: true,
  dueDate: true,
} as const;

type OverdueCandidate = {
  id: string;
  businessId: string;
  invoiceNumber: number;
  numberPrefix: string;
  status: string;
  customerName: string;
  totalCents: number;
  amountPaidCents: number;
  dueDate: Date | null;
};

function groupByBusiness(
  rows: readonly OverdueCandidate[],
): Map<string, OverdueCandidate[]> {
  const grouped = new Map<string, OverdueCandidate[]>();
  for (const row of rows) {
    const existing = grouped.get(row.businessId);
    if (existing) existing.push(row);
    else grouped.set(row.businessId, [row]);
  }
  return grouped;
}

/**
 * `invoice-overdue-<businessId>-<sha1 of the sorted invoice ids, first 16
 * hex chars>` — stable across retries of the same batch (order-independent),
 * distinct across businesses and across different overdue sets for the same
 * business, so Resend's idempotency guard can't collapse two different
 * alerts into one.
 */
function overdueIdempotencyKey(
  businessId: string,
  invoiceIds: readonly string[],
): string {
  const digest = createHash("sha1")
    .update([...invoiceIds].sort().join(","))
    .digest("hex")
    .slice(0, 16);
  return `invoice-overdue-${businessId}-${digest}`;
}

export type NotifyOverdueInvoicesOptions = {
  /** Injectable clock — one run resolves "today" for every business from this instant. */
  now?: Date;
};

/**
 * Sweep SENT/PARTIALLY_PAID invoices past their due date and email each
 * affected owner once per newly-overdue batch.
 *
 * Returns the number of invoices an owner was actually EMAILED about in this
 * run (silently-stamped invoices — alerts disabled, or more than
 * `OVERDUE_ALERT_MAX_AGE_DAYS` overdue — are not counted, since no alert was
 * sent for them).
 */
export async function notifyOverdueInvoices(
  db: DbClient,
  opts: NotifyOverdueInvoicesOptions = {},
): Promise<number> {
  const now = opts.now ?? new Date();

  // Coarse prefilter: `dueDate < now` in real time. Always a superset of "is
  // overdue in some business's zone" — see the module docblock — so no
  // genuinely-overdue invoice can be missed here.
  const candidates: OverdueCandidate[] = await db.invoice.findMany({
    where: {
      status: { in: [...INVOICE_OPEN_STATUSES] },
      overdueNotifiedAt: null,
      dueDate: { not: null, lt: now },
    },
    orderBy: { dueDate: "asc" },
    take: OVERDUE_ALERT_BATCH,
    select: OVERDUE_CANDIDATE_SELECT,
  });
  if (candidates.length === 0) return 0;

  const byBusiness = groupByBusiness(candidates);
  const businessIds = [...byBusiness.keys()];

  // Cron requests arrive on the platform host, so the host-based `featureGate`
  // tRPC middleware can't resolve a business here — resolve each business's
  // flags directly, same as the other cron jobs in this file's docblock.
  const businesses = await db.business.findMany({
    where: { id: { in: businessIds } },
    select: { ...INVOICE_NOTIFY_BUSINESS_SELECT, featureFlags: true },
  });
  const businessById = new Map(businesses.map((b) => [b.id, b]));

  const settingsRows = await db.invoiceSettings.findMany({
    where: { businessId: { in: businessIds } },
    select: {
      businessId: true,
      overdueAlertsEnabled: true,
      numberPadding: true,
    },
  });
  const settingsByBusiness = new Map(
    settingsRows.map((s) => [s.businessId, s]),
  );

  let alertedCount = 0;

  for (const [businessId, invoiceRows] of byBusiness) {
    const business = businessById.get(businessId);
    if (!business) continue;

    try {
      // Skip WITHOUT stamping: a disabled feature must not consume the
      // one-time overdue alert, or re-enabling it later would silently lose
      // the notification for invoices that went overdue while it was off.
      if (!resolveFlags(business.featureFlags).isEnabled("invoices")) continue;

      const settings = settingsByBusiness.get(businessId);
      const overdueAlertsEnabled =
        settings?.overdueAlertsEnabled ??
        DEFAULT_INVOICE_SETTINGS.overdueAlertsEnabled;
      const numberPadding =
        settings?.numberPadding ?? DEFAULT_INVOICE_SETTINGS.numberPadding;

      // The SQL prefilter is coarse (real-time `now`); this is the real rule,
      // evaluated in the business's own zone.
      const overdue = invoiceRows.filter((inv) =>
        isInvoiceOverdue(inv, now, business.timeZone),
      );
      if (overdue.length === 0) continue;

      const today = todayUtcMidnight(now, business.timeZone);
      const silentIds: string[] = [];
      const alertCandidates: OverdueCandidate[] = [];

      for (const inv of overdue) {
        // `dueDate` is non-null here — the query only selected rows with a
        // due date, and the coarse filter never widens that.
        const ageDays = Math.round(
          (today.getTime() - inv.dueDate!.getTime()) / MS_PER_DAY,
        );
        if (!overdueAlertsEnabled || ageDays > OVERDUE_ALERT_MAX_AGE_DAYS) {
          silentIds.push(inv.id);
        } else {
          alertCandidates.push(inv);
        }
      }

      // Silent stamps don't wait on an email outcome — there is no email to
      // wait on. Guarded on `overdueNotifiedAt: null` so a race with another
      // path that already stamped these ids is a harmless no-op.
      if (silentIds.length > 0) {
        await db.invoice.updateMany({
          where: { id: { in: silentIds }, overdueNotifiedAt: null },
          data: { overdueNotifiedAt: now },
        });
      }

      if (alertCandidates.length === 0) continue;

      const rows: OverdueInvoiceRow[] = alertCandidates.map((inv) => ({
        displayNumber: invoiceDisplayNumber(inv, numberPadding),
        customerName: inv.customerName,
        balanceCents: balanceDueCents(inv),
        dueDateLabel: formatInvoiceDateLabel(inv.dueDate),
        adminUrl: adminInvoiceUrl(business, inv.id),
      }));

      const result = await sendInvoiceOverdueOwnerAlert({
        count: rows.length,
        invoices: rows,
        viewAllUrl: adminInvoicesListUrl(business, { status: "overdue" }),
        business,
        idempotencyKey: overdueIdempotencyKey(
          businessId,
          alertCandidates.map((inv) => inv.id),
        ),
      });

      // Stamp-on-success, same as the cron's `notifyBackInStock`: a failed
      // send must leave `overdueNotifiedAt` null so the next tick retries it,
      // rather than silently losing the owner's only notice.
      if (!result.success) continue;

      const alertedIds = alertCandidates.map((inv) => inv.id);
      await db.invoice.updateMany({
        where: { id: { in: alertedIds }, overdueNotifiedAt: null },
        data: { overdueNotifiedAt: now },
      });
      for (const id of alertedIds) {
        await logInvoiceEvent(db, {
          invoiceId: id,
          businessId,
          type: "OVERDUE_ALERTED",
        });
      }
      alertedCount += alertedIds.length;
    } catch (err) {
      // Per-business isolation: nothing here is stamped, so a failure just
      // means this business retries on the next tick.
      Sentry.withScope((scope) => {
        scope.setTag("invoice.step", "overdue-alert");
        scope.setTag("businessId", businessId);
        Sentry.captureException(err);
      });
    }
  }

  return alertedCount;
}
