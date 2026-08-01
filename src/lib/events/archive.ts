import type { DbClient } from "~/server/db";

/**
 * Flip `isArchived` on events whose end (or start, if no end) has passed.
 *
 * IMPORTANT: `isArchived` only drives the admin Upcoming/Past tab split. It is
 * NOT what hides a past event from the storefront — the public query filters
 * by date independently (see `upcomingEventWhere` in `src/lib/events/query.ts`).
 * So a missed or delayed cron run is a cosmetic admin issue (a stale Upcoming
 * tab), never a correctness/leak bug on the storefront.
 *
 * Deliberately platform-wide and NOT gated behind the `events` feature flag,
 * unlike the `backInStock` job in the cron route:
 *   (a) archiving hides nothing, so there's no leak risk in running it for a
 *       business that currently has the flag off, and
 *   (b) it must keep running regardless, otherwise a business that toggles
 *       `events` off and back on would find its Past tab silently rotted
 *       (full of events that are actually over but never got archived).
 *
 * Two separate `updateMany` calls because Prisma can't express
 * `COALESCE("endAt", "startAt") < now` in a `where`. The arms are disjoint
 * by construction, not just by convenience: in SQL `NULL < now` evaluates to
 * NULL (not true), so the first arm (`endAt: { lt: now }`) can never match a
 * row where `endAt` is null — there's no double-counting to guard against,
 * and the second arm's `endAt: null` is required, not just a convenient
 * narrowing. Do not "simplify" this into a single call.
 *
 * Modeled on `sweepStaleReservations` in `src/lib/inventory/reservation.ts`.
 *
 * Returns the total number of events archived.
 */
export async function archivePastEvents(
  db: DbClient,
  now = new Date(),
): Promise<number> {
  const withEnd = await db.event.updateMany({
    where: { isArchived: false, endAt: { lt: now } },
    data: { isArchived: true },
  });

  const withoutEnd = await db.event.updateMany({
    where: { isArchived: false, endAt: null, startAt: { lt: now } },
    data: { isArchived: true },
  });

  return withEnd.count + withoutEnd.count;
}
