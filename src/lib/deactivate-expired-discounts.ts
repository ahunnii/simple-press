import type { PrismaClient } from "generated/prisma";

/**
 * Sets active=false for codes that are past expiry or have exhausted usage limits.
 */
export async function deactivateExpiredDiscountCodes(
  db: PrismaClient,
  businessId: string,
) {
  const now = new Date();

  const expiredByDate = await db.discountCode.updateMany({
    where: {
      businessId,
      active: true,
      expiresAt: { lt: now },
    },
    data: { active: false },
  });

  const candidates = await db.discountCode.findMany({
    where: {
      businessId,
      active: true,
      usageLimit: { not: null },
    },
    select: { id: true, usageLimit: true, usageCount: true },
  });

  const exhaustedIds = candidates
    .filter(
      (c) => c.usageLimit != null && c.usageCount >= c.usageLimit,
    )
    .map((c) => c.id);

  let expiredByUsage = { count: 0 };
  if (exhaustedIds.length > 0) {
    expiredByUsage = await db.discountCode.updateMany({
      where: { id: { in: exhaustedIds } },
      data: { active: false },
    });
  }

  return {
    deactivatedByDate: expiredByDate.count,
    deactivatedByUsage: expiredByUsage.count,
  };
}
