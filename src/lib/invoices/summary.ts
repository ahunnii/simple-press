import "server-only";

import { TRPCError } from "@trpc/server";

import type { TxClient } from "~/server/db";
import { QBO_INVOICE_LIST_MAX_ROWS } from "~/lib/invoices/qbo-limits";
import { todayUtcMidnight, ymdToUtcMidnight } from "~/lib/invoices/status";
import { mapQboRow } from "~/lib/invoices/unified-list";
import { INVOICE_OPEN_STATUSES } from "~/lib/validators/invoice";
import { QBO_OPEN_INVOICE_STATUSES } from "~/lib/validators/quickbooks";

const OPEN_STATUSES: string[] = [...INVOICE_OPEN_STATUSES];

const DAY_MS = 24 * 60 * 60 * 1000;

export interface InvoiceSummary {
  outstandingCents: number;
  outstandingCount: number;
  overdueCents: number;
  overdueCount: number;
  /** Money collected in the collected window (default: the last 30 days). */
  paidLast30Cents: number;
}

export interface InvoiceSummaryOptions {
  /**
   * Inclusive lower bound of the "collected" window, a calendar date
   * (`YYYY-MM-DD`). `undefined` = the default (30 days before today in the
   * business's zone); `null` = no lower bound (all time).
   */
  collectedFromYmd?: string | null;
  /**
   * Exclusive upper bound of the "collected" window, a calendar date
   * (`YYYY-MM-DD`). `undefined` = no upper bound (through now).
   */
  collectedToYmdExclusive?: string;
  /**
   * Which halves to compute (both by default). A half that is turned off
   * skips its queries and reports zeros:
   * - `outstanding`: open + overdue balances and counts (native aggregates
   *   and open QuickBooks rows).
   * - `collected`: `paidLast30Cents` (native payments and QuickBooks paid
   *   aggregates).
   */
  parts?: { outstanding?: boolean; collected?: boolean };
}

/**
 * The invoice summary cards: open balance, overdue balance and money
 * collected. Native figures are SQL aggregates; QuickBooks open balances are
 * added in memory with the same overdue rule (`mapQboRow`).
 *
 * "Collected" is money COLLECTED: native payments with `paidOn` in the window
 * (including payments on invoices later cancelled), plus QuickBooks invoices
 * marked paid in the window. `InvoicePayment.paidOn` and `Invoice.dueDate`
 * are calendar dates stored at UTC midnight, so the window bounds are
 * calendar-date strings converted to UTC midnight — never `Date`s derived from
 * `now` in the server's zone. Default options reproduce the original
 * `invoice.summary` behavior (last 30 days, open-ended).
 *
 * QuickBooks paid invoices are a SQL sum (no row cap); only the open rows go
 * through `mapQboRow` (for the overdue rule) and are capped at
 * `QBO_INVOICE_LIST_MAX_ROWS`, like the list. Stores with no QuickBooks rows
 * get zero from both, whether or not the flag is on.
 */
export async function computeInvoiceSummary(
  db: TxClient,
  businessId: string,
  now: Date,
  opts: InvoiceSummaryOptions = {},
): Promise<InvoiceSummary> {
  const wantOutstanding = opts.parts?.outstanding ?? true;
  const wantCollected = opts.parts?.collected ?? true;

  const business = await db.business.findUnique({
    where: { id: businessId },
    select: { timeZone: true },
  });
  if (!business) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Business not found" });
  }
  const timeZone = business.timeZone;

  const today = todayUtcMidnight(now, timeZone);

  let windowStart: Date | null;
  if (opts.collectedFromYmd === undefined) {
    windowStart = new Date(today.getTime() - 30 * DAY_MS);
  } else if (opts.collectedFromYmd === null) {
    windowStart = null;
  } else {
    windowStart = ymdToUtcMidnight(opts.collectedFromYmd);
  }
  const windowEnd =
    opts.collectedToYmdExclusive !== undefined
      ? ymdToUtcMidnight(opts.collectedToYmdExclusive)
      : null;

  const dateWindow =
    windowStart || windowEnd
      ? {
          ...(windowStart ? { gte: windowStart } : {}),
          ...(windowEnd ? { lt: windowEnd } : {}),
        }
      : undefined;

  const [outstanding, collected] = await Promise.all([
    wantOutstanding
      ? computeOutstanding(db, businessId, now, today, timeZone)
      : Promise.resolve(null),
    wantCollected
      ? Promise.all([
          db.invoicePayment.aggregate({
            where: {
              businessId,
              ...(dateWindow ? { paidOn: dateWindow } : {}),
            },
            _sum: { amountCents: true },
          }),
          db.quickBooksInvoice.aggregate({
            where: {
              businessId,
              status: "paid",
              ...(dateWindow ? { paidAt: dateWindow } : {}),
            },
            _sum: { amountCents: true },
          }),
        ])
      : Promise.resolve(null),
  ]);

  return {
    outstandingCents: outstanding?.outstandingCents ?? 0,
    outstandingCount: outstanding?.outstandingCount ?? 0,
    overdueCents: outstanding?.overdueCents ?? 0,
    overdueCount: outstanding?.overdueCount ?? 0,
    paidLast30Cents: collected
      ? (collected[0]._sum.amountCents ?? 0) +
        (collected[1]._sum.amountCents ?? 0)
      : 0,
  };
}

/** Open + overdue balances: native aggregates plus open QuickBooks rows. */
async function computeOutstanding(
  db: TxClient,
  businessId: string,
  now: Date,
  today: Date,
  timeZone: string,
) {
  const [outstanding, overdue, qboRows] = await Promise.all([
    db.invoice.aggregate({
      where: { businessId, status: { in: OPEN_STATUSES } },
      _sum: { totalCents: true, amountPaidCents: true },
      _count: { _all: true },
    }),
    db.invoice.aggregate({
      where: {
        businessId,
        status: { in: OPEN_STATUSES },
        dueDate: { lt: today },
      },
      _sum: { totalCents: true, amountPaidCents: true },
      _count: { _all: true },
    }),
    db.quickBooksInvoice.findMany({
      where: { businessId, status: { in: [...QBO_OPEN_INVOICE_STATUSES] } },
      take: QBO_INVOICE_LIST_MAX_ROWS,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      select: {
        id: true,
        createdAt: true,
        amountCents: true,
        balanceCents: true,
        status: true,
        dueDate: true,
        qboDocNumber: true,
      },
    }),
  ]);

  let outstandingCents =
    (outstanding._sum.totalCents ?? 0) -
    (outstanding._sum.amountPaidCents ?? 0);
  let outstandingCount = outstanding._count._all;
  let overdueCents =
    (overdue._sum.totalCents ?? 0) - (overdue._sum.amountPaidCents ?? 0);
  let overdueCount = overdue._count._all;

  for (const raw of qboRows) {
    // Customer fields and the `qbo` detail don't affect money or overdue;
    // skip decrypting/loading them here (they cost 1 row's worth of joins
    // × up to `QBO_INVOICE_LIST_MAX_ROWS`, and nothing below reads them).
    const row = mapQboRow(
      {
        ...raw,
        customerName: "",
        customerEmail: "",
        kind: "custom",
        qboInvoiceId: null,
        lastError: null,
        quoteSubmission: null,
      },
      now,
      timeZone,
    );
    outstandingCents += row.balanceCents;
    outstandingCount += 1;
    if (row.isOverdue) {
      overdueCents += row.balanceCents;
      overdueCount += 1;
    }
  }

  return { outstandingCents, outstandingCount, overdueCents, overdueCount };
}
