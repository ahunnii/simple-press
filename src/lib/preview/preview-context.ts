import "server-only";

import { cookies, headers } from "next/headers";

import { isPlatformAdmin } from "~/lib/auth/is-platform-admin";
import { auth } from "~/server/better-auth";
import { db } from "~/server/db";

import { PREVIEW_COOKIE } from "./preview-constants";

export { PREVIEW_COOKIE };

/**
 * Returns the businessId from the preview cookie ONLY if the current session
 * user is a PLATFORM_ADMIN or an OWNER/MANAGER member of that business.
 * Returns null for anonymous visitors, non-members, or cookie/session mismatches.
 *
 * Quadruple-guarded:
 *   1. Cookie value must equal the resolved businessId passed in.
 *   2. Request must carry the x-sp-preview header (set by middleware on ?__preview=1).
 *   3. Session must be authenticated.
 *   4. User must be PLATFORM_ADMIN or hold OWNER/MANAGER membership.
 */
export async function getAuthorizedPreviewBusinessId(
  resolvedBusinessId: string,
): Promise<string | null> {
  // 1. Check the cookie value first — fast bail-out for the common anon path.
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(PREVIEW_COOKIE)?.value;
  if (!cookieValue || cookieValue !== resolvedBusinessId) {
    return null;
  }

  // 2. Require the ?__preview=1 signal (set by middleware as x-sp-preview header).
  const headersList = await headers();
  if (headersList.get("x-sp-preview") !== "1") return null;

  // 3. Verify the session.
  const session = await auth.api.getSession({ headers: headersList });
  if (!session?.user) {
    return null;
  }

  const user = session.user;

  // 4. PLATFORM_ADMIN bypasses membership check — live DB read.
  if (await isPlatformAdmin(user.id)) {
    return resolvedBusinessId;
  }

  // 5. Check business membership (OWNER or MANAGER).
  const membership = await db.businessMembership.findUnique({
    where: {
      userId_businessId: {
        userId: user.id,
        businessId: resolvedBusinessId,
      },
    },
    select: { role: true },
  });

  if (membership && ["OWNER", "MANAGER"].includes(membership.role)) {
    return resolvedBusinessId;
  }

  return null;
}
