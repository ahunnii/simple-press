import "server-only";

import { Prisma } from "generated/prisma";

import type { DashboardLayout } from "~/lib/dashboard/layout-schema";
import type { TxClient } from "~/server/db";

/**
 * The caller's `BusinessMembership` for this store, keyed by
 * `(session.user.id, businessId)`.
 *
 * NEVER derive "can this person save a layout?" from `ctx.membershipRole`: it
 * is null for platform admins even when they also hold a membership, and a
 * platform admin without one has nowhere to store a layout.
 */
export async function findDashboardMembership(
  db: TxClient,
  userId: string,
  businessId: string,
): Promise<{ id: string; dashboardLayout: unknown } | null> {
  const membership = await db.businessMembership.findUnique({
    where: { userId_businessId: { userId, businessId } },
    select: { id: true, dashboardLayout: true },
  });
  return membership;
}

/** Persist a layout on the membership. */
export async function writeDashboardLayout(
  db: TxClient,
  membershipId: string,
  layout: DashboardLayout,
): Promise<void> {
  await db.businessMembership.update({
    where: { id: membershipId },
    data: { dashboardLayout: layout as unknown as Prisma.InputJsonValue },
  });
}

/**
 * Back to "never customized": the column returns to SQL NULL.
 *
 * Raw SQL on purpose, not `data: { dashboardLayout: Prisma.DbNull }`. The
 * shared `db` client can come from a different Prisma module instance than
 * this file's `Prisma` (Next server layers), and the client recognises
 * `DbNull` with `instanceof`, so a foreign sentinel was written as the JSON
 * object `{}`. A prebuilt `Prisma.sql` object is matched by shape instead.
 */
export async function clearDashboardLayout(
  db: TxClient,
  membershipId: string,
): Promise<void> {
  await db.$executeRaw(
    Prisma.sql`UPDATE "BusinessMembership" SET "dashboardLayout" = NULL WHERE "id" = ${membershipId}`,
  );
}
