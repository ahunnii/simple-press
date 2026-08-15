import "server-only";

import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import type { AdminRole } from "~/app/admin/_lib/admin-nav";
import { isPlatformAdmin } from "~/lib/auth/is-platform-admin";
import {
  checkBusiness,
  checkBusinessAnyStatus,
  checkBusinessMembership,
} from "~/lib/check-business";
import { getSession } from "~/server/better-auth/server";
import { isPathAllowedForRole } from "~/app/admin/_lib/admin-nav";

export type RequireAdminAccessResult = {
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>;
  business: NonNullable<Awaited<ReturnType<typeof checkBusiness>>>;
  /** Resolved BusinessMembership role, or null for PLATFORM_ADMIN (implicit access). */
  membershipRole: AdminRole | null;
  /**
   * `BusinessMembership.merchantTermsAcceptedAt` for THIS membership, piggybacked
   * on the membership lookup for the `/admin` retroactive-terms gate.
   *
   * Three-state, and only meaningful alongside `membershipRole === "OWNER"`:
   * `Date` = on file, `null` = nothing on file, `undefined` = not determined
   * (PLATFORM_ADMIN, who never runs a membership lookup at all, or a database
   * that does not have the column yet). Read it through
   * `shouldPromptOwnerTerms` in `~/lib/legal/owner-terms-gate` rather than
   * testing it directly — `undefined` must never be treated as "not accepted".
   */
  merchantTermsAcceptedAt?: Date | null;
};

type Options = {
  /**
   * Membership roles allowed to pass the guard. Defaults to the admin
   * dashboard's current set. A future caller (e.g. an /editor layout) can
   * narrow or widen this without touching the redirect/session logic below.
   */
  allowedRoles?: AdminRole[];
};

/**
 * Session → business → membership resolution guard shared by admin-style
 * layouts. Redirect targets and PLATFORM_ADMIN bypass semantics match the
 * historical `/admin/layout.tsx` behavior exactly:
 *
 * 1. No session → redirect to `/auth/sign-in?redirectTo=/admin`.
 * 2. No resolved business for the current host → `notFound()`.
 * 3. PLATFORM_ADMIN → bypasses membership checks entirely (`membershipRole: null`).
 * 4. Everyone else must have a BusinessMembership with an allowed role, else
 *    redirect to `/not-permitted`.
 * 5. STAFF members are further restricted to their allowed admin paths
 *    (via `x-pathname`); anything else redirects to `/admin/orders`.
 */
export async function requireAdminAccess(
  options: Options = {},
): Promise<RequireAdminAccessResult> {
  const allowedRoles = options.allowedRoles ?? ["OWNER", "MANAGER", "STAFF"];

  const session = await getSession();

  if (!session) {
    redirect("/auth/sign-in?redirectTo=/admin");
  }

  // Allow PLATFORM_ADMIN unconditionally — live DB read, never cookie cache.
  const platformAdmin = await isPlatformAdmin(session.user.id);

  // `checkBusiness()` only resolves ACTIVE stores. Platform admins must still
  // be able to open a suspended store's /admin to remediate the suspension
  // (closed platform — admins disable a store, fix it, re-enable it), so fall
  // back to a status-agnostic lookup for them only. Everyone else keeps 404.
  const business =
    (await checkBusiness()) ??
    (platformAdmin ? await checkBusinessAnyStatus() : null);

  if (!business) {
    notFound();
  }

  let membershipRole: AdminRole | null = null;
  // Stays `undefined` for PLATFORM_ADMIN — no membership is looked up, so there
  // is nothing to report, and "unknown" is the honest value.
  let merchantTermsAcceptedAt: Date | null | undefined;
  if (!platformAdmin) {
    // For everyone else, check BusinessMembership
    const membership = await checkBusinessMembership(
      business.id,
      session.user.id,
    );
    if (!membership || !allowedRoles.includes(membership.role as AdminRole)) {
      redirect("/not-permitted");
    }
    membershipRole = membership.role as AdminRole;
    merchantTermsAcceptedAt = membership.merchantTermsAcceptedAt;

    // STAFF is fulfillment-only: orders + customers. Middleware exposes the
    // requested path via x-pathname; anything outside the allowed pages sends
    // staff back to their home page (/admin/orders). This is a UX guard —
    // the real enforcement lives in the tRPC procedures (staffProcedure vs
    // ownerAdminProcedure).
    if (membershipRole === "STAFF") {
      const headersList = await headers();
      const rawPath = headersList.get("x-pathname");
      const pathname = rawPath?.split("?")[0] ?? "";
      if (pathname && !isPathAllowedForRole(pathname, "STAFF")) {
        redirect("/admin/orders");
      }
    }
  }

  return { session, business, membershipRole, merchantTermsAcceptedAt };
}
