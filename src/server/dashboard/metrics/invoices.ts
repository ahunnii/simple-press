import type { StatPart, StatQuery } from "./types";
import { computeInvoiceSummary } from "~/lib/invoices/summary";
import { formatCurrency } from "~/lib/utils";

import {
  pickTotals,
  queryInvoicePaymentTotals,
  ymdSeriesPoints,
} from "./series";

export type InvoiceWidget =
  | "invoices-outstanding"
  | "invoices-overdue"
  | "invoices-collected";

const countLabel = (n: number, noun: string) => `${n} ${noun}`;

/**
 * Open balance and overdue balance are point-in-time; collected is money
 * received inside the window (calendar-date bounds, because `paidOn` is a
 * date stored at UTC midnight). The summary also merges QuickBooks invoices,
 * exactly like `invoice.summary`, but each card asks only for the half it
 * shows (`parts`) so it skips the other half's queries.
 */
export async function invoiceStat(
  q: StatQuery,
  widget: InvoiceWidget,
): Promise<StatPart> {
  const { db, ctx, win } = q;

  if (widget === "invoices-collected") {
    const summary = await computeInvoiceSummary(db, ctx.businessId, ctx.now, {
      collectedFromYmd: win.startYmd,
      collectedToYmdExclusive: win.endYmdExclusive,
      parts: { collected: true, outstanding: false },
    });
    const part: StatPart = {
      value: summary.paidLast30Cents,
      detail: [],
      note: "Payments recorded on invoices",
    };
    if (q.series) {
      // Native payments only: QuickBooks "paid" invoices have no per-payment
      // dates to bucket.
      const totals = await queryInvoicePaymentTotals(db, {
        businessId: ctx.businessId,
        window: win,
        granularity: q.granularity,
      });
      part.series = ymdSeriesPoints(
        pickTotals(totals, (b) => b.sum),
        win,
        q.granularity,
      );
    }
    return part;
  }

  const summary = await computeInvoiceSummary(db, ctx.businessId, ctx.now, {
    parts: { outstanding: true, collected: false },
  });
  if (widget === "invoices-outstanding") {
    return {
      value: summary.outstandingCents,
      detail: [
        countLabel(
          summary.outstandingCount,
          summary.outstandingCount === 1 ? "open invoice" : "open invoices",
        ),
        ...(summary.overdueCount > 0
          ? [`${formatCurrency(summary.overdueCents)} overdue`]
          : []),
      ],
    };
  }
  return {
    value: summary.overdueCents,
    detail: [
      countLabel(
        summary.overdueCount,
        summary.overdueCount === 1 ? "overdue invoice" : "overdue invoices",
      ),
    ],
  };
}
