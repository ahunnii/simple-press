"use server";

import { headers } from "next/headers";

import { businessHostFilter } from "~/lib/domain-utils";
import { db } from "~/server/db";

export const checkBusiness = async () => {
  const headersList = await headers();

  const hostname = headersList.get("host") ?? "";

  const business = await db.business.findFirst({
    where: {
      ...businessHostFilter(hostname),
      status: "active",
    },
    select: {
      id: true,
      name: true,
      customDomain: true,
      umamiWebsiteId: true,
      umamiEnabled: true,
      // Rides along on the tenant lookup every storefront request already
      // makes, so anything needing the STORE's calendar day — a quote date
      // question's "today or later" bound, measured in the owner's zone and
      // not the visitor's — costs no extra query. Purely additive.
      //
      // Selected identically by `checkBusinessAnyStatus` below: the two are
      // used interchangeably (`require-admin-access.ts`,
      // `get-business-flags.ts`), so a field present in one and absent from
      // the other is unreadable on the union of their return types.
      timeZone: true,
    },
  });
  return business;
};

/**
 * Resolve the caller's membership in a business.
 *
 * `merchantTermsAcceptedAt` rides along on this existing round trip so the
 * `/admin` retroactive-terms gate (`src/app/admin/layout.tsx`) costs nothing
 * extra on a normal page load. It is deliberately three-state:
 *
 * - `Date`      — an acceptance is on file.
 * - `null`      — nothing on file; the owner gets the acceptance interstitial.
 * - `undefined` — the column could not be read. The terms columns were added
 *   to `schema.prisma` ahead of the database migration, so code can ship before
 *   the columns exist. If the select blows up on a database without them, we
 *   retry with the role-only select and omit the field: the admin guard keeps
 *   working and the gate fails OPEN. Locking every owner out of their orders
 *   over a consent prompt would be far worse than a missed prompt.
 */
/**
 * Like {@link checkBusiness} but without the `status: "active"` filter.
 *
 * ONLY for platform-admin flows: admins temporarily suspend a store to
 * remediate a policy violation and must still be able to load its /admin and
 * tenant-scoped procedures while it is suspended. Never use this for
 * storefront or customer-facing resolution — suspension must stay invisible
 * to everyone else.
 */
export const checkBusinessAnyStatus = async () => {
  const headersList = await headers();

  const hostname = headersList.get("host") ?? "";

  const business = await db.business.findFirst({
    where: businessHostFilter(hostname),
    select: {
      id: true,
      name: true,
      customDomain: true,
      umamiWebsiteId: true,
      umamiEnabled: true,
      // Kept in lockstep with `checkBusiness` — see the note there.
      timeZone: true,
    },
  });
  return business;
};

export const checkBusinessMembership = async (
  businessId: string,
  userId: string,
): Promise<{
  role: string;
  merchantTermsAcceptedAt?: Date | null;
} | null> => {
  try {
    return await db.businessMembership.findUnique({
      where: { userId_businessId: { userId, businessId } },
      select: { role: true, merchantTermsAcceptedAt: true },
    });
  } catch {
    return db.businessMembership.findUnique({
      where: { userId_businessId: { userId, businessId } },
      select: { role: true },
    });
  }
};

export const checkBusinessForEmail = async () => {
  const headersList = await headers();

  const hostname = headersList.get("host") ?? "";

  const business = await db.business.findFirst({
    where: {
      ...businessHostFilter(hostname),
      status: "active",
    },
    select: {
      id: true,
      name: true,
      customDomain: true,
      subdomain: true,
      domainStatus: true,
      siteContent: { select: { logoUrl: true } },
    },
  });
  return business;
};
