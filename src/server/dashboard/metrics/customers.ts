import { Prisma } from "generated/prisma";

import type { SeriesTable, SeriesTimeColumn } from "./series";
import type { MetricWindow, StatPart, StatQuery } from "./types";
import { marketingAudienceWhere } from "~/lib/marketing/audience";

import { pickTotals, queryBucketTotals, windowSeriesPoints } from "./series";

export type CustomerWidget =
  | "new-customers"
  | "total-customers"
  | "quote-requests"
  | "form-submissions"
  | "upcoming-events"
  | "testimonials-pending"
  | "email-subscribers";

/**
 * Events still to come or in progress: the same cutoff as the admin Events
 * list's Upcoming view (`endAt ?? startAt` has not passed; all-day events are
 * pinned to 23:59:59.999 local on write), not archived, and published (drafts
 * are not upcoming events to anyone but the owner).
 */
export function upcomingEventsWhere(
  businessId: string,
  now: Date,
): Prisma.EventWhereInput {
  return {
    businessId,
    published: true,
    isArchived: false,
    OR: [{ endAt: { gte: now } }, { endAt: null, startAt: { gte: now } }],
  };
}

/** Pending in the admin Testimonials list: not approved and not hidden. */
export function pendingTestimonialsWhere(
  businessId: string,
): Prisma.TestimonialWhereInput {
  return { businessId, isApproved: false, isHidden: false };
}

function range(win: MetricWindow) {
  return { ...(win.start ? { gte: win.start } : {}), lt: win.endExclusive };
}

/**
 * - new-customers: accounts created in the window. Like /admin/customers, it
 *   does not exclude anonymized rows (they are still accounts in that list).
 * - total-customers: every customer row, point-in-time.
 * - upcoming-events / testimonials-pending / email-subscribers: point-in-time
 *   (see the where builders above; email-subscribers is the Email Marketing
 *   page's own audience definition, `marketingAudienceWhere`).
 * - quote-requests: `QuoteSubmission.createdAt` in the window.
 * - form-submissions: `FormSubmission.submittedAt`, `source = "WEB"` only, so
 *   CSV imports don't inflate the number.
 */
export async function customerStat(
  q: StatQuery,
  widget: CustomerWidget,
): Promise<StatPart> {
  const { db, ctx, win } = q;
  const businessId = ctx.businessId;

  if (widget === "total-customers") {
    return {
      value: await db.customer.count({ where: { businessId } }),
      detail: [],
    };
  }

  if (widget === "upcoming-events") {
    return {
      value: await db.event.count({
        where: upcomingEventsWhere(businessId, ctx.now),
      }),
      detail: [],
    };
  }

  if (widget === "testimonials-pending") {
    return {
      value: await db.testimonial.count({
        where: pendingTestimonialsWhere(businessId),
      }),
      detail: [],
    };
  }

  if (widget === "email-subscribers") {
    return {
      value: await db.customer.count({
        where: marketingAudienceWhere(businessId),
      }),
      detail: [],
    };
  }

  let value: number;
  let table: SeriesTable;
  let timeColumn: SeriesTimeColumn = "createdAt";
  let whereSql: Prisma.Sql | undefined;

  switch (widget) {
    case "new-customers":
      value = await db.customer.count({
        where: { businessId, createdAt: range(win) },
      });
      table = "Customer";
      break;
    case "quote-requests":
      value = await db.quoteSubmission.count({
        where: { businessId, createdAt: range(win) },
      });
      table = "QuoteSubmission";
      break;
    case "form-submissions":
      value = await db.formSubmission.count({
        where: { businessId, source: "WEB", submittedAt: range(win) },
      });
      table = "FormSubmission";
      timeColumn = "submittedAt";
      whereSql = Prisma.sql`"source" = 'WEB'`;
      break;
  }

  const part: StatPart = { value, detail: [] };
  if (q.series) {
    const totals = await queryBucketTotals(db, {
      table,
      timeColumn,
      businessId,
      window: win,
      granularity: q.granularity,
      timeZone: ctx.timeZone,
      whereSql,
    });
    part.series = windowSeriesPoints(
      pickTotals(totals, (b) => b.count),
      win,
      q.granularity,
      ctx.timeZone,
    );
  }
  return part;
}
