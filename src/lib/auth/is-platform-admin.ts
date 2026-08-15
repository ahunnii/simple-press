import "server-only";

import { db } from "~/server/db";

/**
 * Resolve whether a user is currently a platform admin from the database.
 *
 * Never authorize from `session.user.platformRole` alone. Better Auth's
 * session cookie cache can retain a stale role for the full cache lifetime
 * after a demotion, promotion, or (before `input: false`) a client-side
 * self-escalation. Privileged gates must re-read the live row.
 */
export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { platformRole: true },
  });
  return user?.platformRole === "PLATFORM_ADMIN";
}
