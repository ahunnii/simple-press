import "server-only";

import * as Sentry from "@sentry/nextjs";

import type { DigestInvoiceRow } from "~/emails/invoice-weekly-digest";
import type { DbClient } from "~/server/db";
import { sendInvoiceWeeklyDigest } from "~/lib/email/templates";
import { resolveFlags } from "~/lib/features/resolve-flags";
import { INVOICE_OPEN_STATUSES } from "~/lib/validators/invoice";

import {
  adminInvoicesListUrl,
  adminInvoiceUrl,
  formatInvoiceDateLabel,
  INVOICE_NOTIFY_BUSINESS_SELECT,
  invoiceDisplayNumber,
} from "./notify";
import { digestWindow } from "./schedule";
import { isInvoiceOverdue, todayUtcMidnight } from "./status";
import { balanceDueCents } from "./totals";

/**
 * The weekly owner invoice digest — "every Monday at 8am in the business's
 * time zone" (`digestWindow`, `src/lib/invoices/schedule.ts`). Covers native
 * invoices only for this MVP; QuickBooks invoices don't feed the totals.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WINDOW + DEDUPE
 * ────────────────────────────────────────────────────────────────────────────
 * The cron runs on a fixed ~15-minute UTC cadence, so every business is asked
 * `digestWindow(now, business.timeZone)` on every tick. `due` is true from
 * Monday 08:00 local through the rest of the week (see `schedule.ts` for the
 * catch-up rationale), and `InvoiceSettings.lastDigestWeekKey` is what turns
 * that open window into "send exactly once" — the first tick that sees a new
 * `weekKey` sends, every later tick that week sees its own stamp and skips.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * "NOTHING TO REPORT" STILL STAMPS
 * ────────────────────────────────────────────────────────────────────────────
 * A business with no open invoices and nothing collected in the last 7 days
 * has nothing worth emailing about, but the week still needs to be marked
 * done — otherwise every 15-minute tick for the rest of the week would redo
 * the same (empty) query. Only `lastDigestWeekKey` moves on this path;
 * `lastDigestSentAt` is left alone because no email went out.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ISOLATION
 * ────────────────────────────────────────────────────────────────────────────
 * Each business is processed inside its own try/catch, matching every other
 * job in this cron. A business whose `invoices` flag is off is skipped with
 * no write at all, so re-enabling it takes effect on the very next tick
 * rather than waiting out a stamp made while it was disabled.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Rows never carry more than this many invoices — the email is a summary. */
const DIGEST_MAX_ROWS = 20;

const DIGEST_SETTINGS_SELECT = {
  businessId: true,
  lastDigestWeekKey: true,
  numberPadding: true,
  business: {
    select: { ...INVOICE_NOTIFY_BUSINESS_SELECT, featureFlags: true },
  },
} as const;

/** The plaintext columns the digest needs from an open invoice. */
const OPEN_INVOICE_SELECT = {
  id: true,
  invoiceNumber: true,
  numberPrefix: true,
  status: true,
  customerName: true,
  totalCents: true,
  amountPaidCents: true,
  dueDate: true,
} as const;

type OpenInvoiceRow = {
  id: string;
  invoiceNumber: number;
  numberPrefix: string;
  status: string;
  customerName: string;
  totalCents: number;
  amountPaidCents: number;
  dueDate: Date | null;
};

export type SendInvoiceDigestsOptions = {
  /** Injectable clock — one run resolves "today"/"is it Monday yet" for every business from this instant. */
  now?: Date;
};

/**
 * Send the weekly invoice summary to every business whose digest is enabled,
 * due, and not already sent for this week's key.
 *
 * Returns the number of businesses actually EMAILED in this run (businesses
 * whose week was stamped because there was nothing to report are not
 * counted, since no email was sent).
 */
export async function sendInvoiceDigests(
  db: DbClient,
  opts: SendInvoiceDigestsOptions = {},
): Promise<number> {
  const now = opts.now ?? new Date();

  const settingsRows = await db.invoiceSettings.findMany({
    where: { weeklyDigestEnabled: true },
    select: DIGEST_SETTINGS_SELECT,
  });
  if (settingsRows.length === 0) return 0;

  let emailedCount = 0;

  for (const settings of settingsRows) {
    const { business } = settings;
    const businessId = settings.businessId;

    try {
      // Cron requests arrive on the platform host, so the host-based
      // `featureGate` tRPC middleware can't resolve a business here — resolve
      // the flags directly, same as the other cron jobs.
      if (!resolveFlags(business.featureFlags).isEnabled("invoices")) {
        continue;
      }

      const { due, weekKey } = digestWindow(now, business.timeZone);
      if (!due || settings.lastDigestWeekKey === weekKey) continue;

      const openInvoices: OpenInvoiceRow[] = await db.invoice.findMany({
        where: { businessId, status: { in: [...INVOICE_OPEN_STATUSES] } },
        select: OPEN_INVOICE_SELECT,
      });

      const today = todayUtcMidnight(now, business.timeZone);
      const sevenDaysAgo = new Date(today.getTime() - 7 * MS_PER_DAY);
      const collected = await db.invoicePayment.aggregate({
        where: { businessId, paidOn: { gte: sevenDaysAgo } },
        _sum: { amountCents: true },
      });
      const collectedLast7DaysCents = collected._sum.amountCents ?? 0;

      // Nothing worth emailing about. Stamp the week so the rest of it
      // doesn't redo this same (empty) work every tick, but leave
      // `lastDigestSentAt` alone — no email went out.
      if (openInvoices.length === 0 && collectedLast7DaysCents === 0) {
        await db.invoiceSettings.updateMany({
          where: {
            businessId,
            OR: [
              { lastDigestWeekKey: null },
              { NOT: { lastDigestWeekKey: weekKey } },
            ],
          },
          data: { lastDigestWeekKey: weekKey },
        });
        continue;
      }

      const overdueFlags = new Map(
        openInvoices.map((inv) => [
          inv.id,
          isInvoiceOverdue(inv, now, business.timeZone),
        ]),
      );

      let outstandingCents = 0;
      let overdueCount = 0;
      let overdueCents = 0;
      for (const inv of openInvoices) {
        const balance = balanceDueCents(inv);
        outstandingCents += balance;
        if (overdueFlags.get(inv.id)) {
          overdueCount++;
          overdueCents += balance;
        }
      }

      // Overdue first (most overdue / soonest due within each group), capped
      // at DIGEST_MAX_ROWS — the email is a summary, not the full list.
      const sorted = [...openInvoices].sort((a, b) => {
        const aOverdue = overdueFlags.get(a.id) ?? false;
        const bOverdue = overdueFlags.get(b.id) ?? false;
        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
        const aDue = a.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
        const bDue = b.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
        return aDue - bDue;
      });

      const rows: DigestInvoiceRow[] = sorted
        .slice(0, DIGEST_MAX_ROWS)
        .map((inv) => ({
          displayNumber: invoiceDisplayNumber(inv, settings.numberPadding),
          customerName: inv.customerName,
          balanceCents: balanceDueCents(inv),
          dueDateLabel: formatInvoiceDateLabel(inv.dueDate),
          isOverdue: overdueFlags.get(inv.id) ?? false,
          adminUrl: adminInvoiceUrl(business, inv.id),
        }));

      const result = await sendInvoiceWeeklyDigest({
        outstandingCount: openInvoices.length,
        outstandingCents,
        overdueCount,
        overdueCents,
        collectedLast7DaysCents,
        invoices: rows,
        viewAllUrl: adminInvoicesListUrl(business),
        business,
        idempotencyKey: `invoice-digest-${businessId}-${weekKey}`,
      });

      // Stamp-on-success: a failed send leaves `lastDigestWeekKey` unchanged
      // so the same (still-due) week is retried on the next tick, with the
      // same idempotency key.
      if (!result.success) continue;

      await db.invoiceSettings.updateMany({
        where: {
          businessId,
          OR: [
            { lastDigestWeekKey: null },
            { NOT: { lastDigestWeekKey: weekKey } },
          ],
        },
        data: { lastDigestWeekKey: weekKey, lastDigestSentAt: now },
      });
      emailedCount++;
    } catch (err) {
      // Per-business isolation: nothing here is stamped, so a failure just
      // means this business retries on the next tick.
      Sentry.withScope((scope) => {
        scope.setTag("invoice.step", "weekly-digest");
        scope.setTag("businessId", businessId);
        Sentry.captureException(err);
      });
    }
  }

  return emailedCount;
}
