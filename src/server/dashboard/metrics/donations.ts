import { Prisma } from "generated/prisma";

import type { MetricWindow, StatPart, StatQuery } from "./types";
import { bucketByZone, bucketLabel } from "~/lib/dashboard/buckets";
import { normalizeTimeZone } from "~/lib/dashboard/ranges";

import { pickTotals, queryBucketTotals, windowSeriesPoints } from "./series";

export type DonationWidget =
  | "donations-total"
  | "donations-count"
  | "donors-count"
  | "donation-average";

export const DONORS_NOTE = "Donations without an email aren't counted";

function createdAtWindow(win: MetricWindow) {
  return {
    ...(win.start ? { gte: win.start } : {}),
    lt: win.endExclusive,
  };
}

/**
 * Every donation row counts: the model has no status (a row exists only once
 * the payment succeeded) and /admin/donations totals them all the same way.
 */
export async function donationStat(
  q: StatQuery,
  widget: DonationWidget,
): Promise<StatPart> {
  const { db, ctx, win } = q;
  const where = { businessId: ctx.businessId, createdAt: createdAtWindow(win) };

  if (widget === "donors-count") {
    // `donorEmail` is encrypted (it can't be grouped or distinct-counted in
    // SQL); the Prisma extension decrypts on read, so dedupe in memory.
    const rows = await db.donation.findMany({
      where,
      select: { createdAt: true, donorEmail: true },
    });
    const emailOf = (row: { donorEmail: string | null }) => {
      const email = (row.donorEmail ?? "").trim().toLowerCase();
      return email.length > 0 ? email : null;
    };

    const unique = new Set<string>();
    for (const row of rows) {
      const email = emailOf(row);
      if (email) unique.add(email);
    }
    const part: StatPart = {
      value: unique.size,
      detail: [],
      note: DONORS_NOTE,
    };
    if (q.series) {
      const tz = normalizeTimeZone(ctx.timeZone);
      const start =
        win.start ??
        rows.reduce<Date>(
          (min, row) => (row.createdAt < min ? row.createdAt : min),
          win.endExclusive,
        );
      part.series = bucketByZone<
        { createdAt: Date; donorEmail: string | null },
        Set<string>
      >(rows, {
        start,
        end: win.endExclusive,
        granularity: q.granularity,
        timeZone: tz,
        at: (row) => row.createdAt,
        empty: () => new Set<string>(),
        add: (acc, row) => {
          const email = emailOf(row);
          if (email) acc.add(email);
          return acc;
        },
      }).map((bucket) => ({
        key: bucket.key,
        label: bucketLabel(bucket.key, q.granularity),
        value: bucket.value.size,
      }));
    }
    return part;
  }

  const agg = await db.donation.aggregate({
    where,
    _sum: { amountCents: true },
    _count: { _all: true },
  });
  const totalCents = agg._sum.amountCents ?? 0;
  const count = agg._count._all;

  const value =
    widget === "donations-total"
      ? totalCents
      : widget === "donations-count"
        ? count
        : count > 0
          ? Math.round(totalCents / count)
          : null;

  const detail =
    widget === "donations-total" && count > 0
      ? [`${count} ${count === 1 ? "gift" : "gifts"}`]
      : [];

  const part: StatPart = { value, detail };
  if (q.series) {
    const totals = await queryBucketTotals(db, {
      table: "Donation",
      timeColumn: "createdAt",
      businessId: ctx.businessId,
      window: win,
      granularity: q.granularity,
      timeZone: ctx.timeZone,
      sumSql: Prisma.sql`SUM("amountCents")`,
    });
    part.series = windowSeriesPoints(
      pickTotals(totals, (b) =>
        widget === "donations-total"
          ? b.sum
          : widget === "donations-count"
            ? b.count
            : b.count > 0
              ? Math.round(b.sum / b.count)
              : 0,
      ),
      win,
      q.granularity,
      ctx.timeZone,
    );
  }
  return part;
}
