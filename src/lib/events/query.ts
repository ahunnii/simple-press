// ─────────────────────────────────────────────────────────────────────────────
// Events — shared Prisma `where` fragments
// ─────────────────────────────────────────────────────────────────────────────
//
// Deliberately untyped against Prisma's generated namespace: this module is
// imported by storefront server components that sit next to client bundles, and
// keeping it free of any `generated/prisma` reference means it can never pull
// the client in by accident. The shapes are plain object literals that Prisma
// structurally accepts wherever an `EventWhereInput` is expected.

/**
 * "Upcoming" = published, not archived, and not over yet.
 *
 * The OR is not a stylistic choice and MUST NOT be collapsed. What we actually
 * want is `COALESCE(endAt, startAt) >= now` — an event with an end time is over
 * when it ends, an event without one is over when it starts. Prisma has no way
 * to express COALESCE inside a `where`, so it is spelled out as two arms.
 *
 * The two arms are disjoint, so no row is ever matched twice: in SQL,
 * `NULL >= now` evaluates to NULL rather than true, which means
 * `{ endAt: { gte: now } }` already excludes every row where endAt IS NULL.
 * The second arm exists precisely to pick those rows back up via startAt, and
 * its explicit `endAt: null` keeps it from overlapping the first.
 *
 * This is the single most likely thing for a future reader to "simplify" into a
 * bug — dropping `endAt: null` from the second arm would double-count every
 * timed event, and replacing the whole thing with `startAt: { gte: now }` would
 * make multi-day events vanish from the storefront on their opening day.
 */
export function upcomingEventWhere(businessId: string, now: Date) {
  return {
    businessId,
    published: true,
    isArchived: false,
    OR: [{ endAt: { gte: now } }, { endAt: null, startAt: { gte: now } }],
  };
}

/**
 * "Past" = the exact date-complement of `upcomingEventWhere`, scoped to the
 * business. Publication state is intentionally absent: this backs the admin
 * "Past" tab, where an owner needs to find drafts and archived events too.
 *
 * Same disjointness argument as above, inverted: `NULL < now` is also NULL, so
 * the first arm never matches an open-ended event and the second arm handles
 * them by startAt.
 */
export function pastEventWhere(businessId: string, now: Date) {
  return {
    businessId,
    OR: [{ endAt: { lt: now } }, { endAt: null, startAt: { lt: now } }],
  };
}
