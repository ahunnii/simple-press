import type { DbClient } from "~/server/db";
import { startOfToday } from "~/lib/discount-validation";

/**
 * Sets active=false for codes that are past expiry or have exhausted usage limits.
 */
export async function deactivateExpiredDiscountCodes(
  db: DbClient,
  businessId: string,
) {
  const now = new Date();

  const expiredByDate = await db.discountCode.updateMany({
    where: {
      businessId,
      active: true,
      // A code stays valid through the end of its expiry day (see
      // `isPastExpiry`), so only deactivate once that whole day is behind us.
      expiresAt: { lt: startOfToday(now) },
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
    .filter((c) => c.usageLimit != null && c.usageCount >= c.usageLimit)
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
