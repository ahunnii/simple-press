import type { DbClient } from "~/server/db";
import { startOfToday } from "~/lib/discount-validation";
import { countHeldDiscountUses } from "~/lib/inventory/reservation";

/**
 * Sets active=false for codes that are past expiry or have exhausted usage limits.
 *
 * Usage-limit exhaustion counts FINAL uses only. `usageCount` also includes
 * uses held by open checkouts (claimed at checkout start, see
 * `reserveInventory`), and a held use is given back if that checkout expires
 * or its payment fails — so a code that is at its limit only because of open
 * checkouts stays active. Checkout validation still refuses it meanwhile
 * (`usageCount >= usageLimit`), and once the hold is released it is usable
 * again without the owner having to switch it back on.
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

  const atLimit = candidates.filter(
    (c) => c.usageLimit != null && c.usageCount >= c.usageLimit,
  );
  const held = await countHeldDiscountUses(db, {
    businessId,
    discountCodeIds: atLimit.map((c) => c.id),
  });
  const exhaustedIds = atLimit
    .filter(
      (c) => c.usageCount - (held.get(c.id) ?? 0) >= (c.usageLimit ?? Infinity),
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
