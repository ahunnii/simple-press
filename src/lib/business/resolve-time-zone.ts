import type { DbClient } from "~/server/db";

/** Matches `Business.timeZone`'s column default in schema.prisma. */
export const DEFAULT_TIME_ZONE = "America/Detroit";

/**
 * Resolves a business's IANA time zone. The fallback only matters if a row
 * somehow lacks a value; the column itself is non-null with a default.
 *
 * Used by `events.ts` (wall-clock normalization for admin-entered dates).
 * Lives here rather than in that router so any other server code that needs
 * "what zone does this business operate in" resolves it the same way; the
 * weekday publish-rule evaluation in `videos.ts` reads the same column via a
 * nested select on the source instead of a second round-trip.
 */
export async function resolveTimeZone(
  db: DbClient,
  businessId: string,
): Promise<string> {
  const business = await db.business.findUnique({
    where: { id: businessId },
    select: { timeZone: true },
  });
  return business?.timeZone ?? DEFAULT_TIME_ZONE;
}
