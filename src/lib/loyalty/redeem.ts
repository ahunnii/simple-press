/**
 * Loyalty Rewards — spending points on a redemption tier.
 *
 * A redemption is three writes that must all happen or none of them:
 * the points come off the balance, a single-use `DiscountCode` is minted, and
 * a `redeem` ledger row records both. They run in ONE transaction, so a
 * customer can never end up charged points with no code, or holding a code
 * they never paid for.
 */

import type { DbClient } from "~/server/db";
import { generateRewardCode } from "~/lib/loyalty/codes";
import { getBalance } from "~/lib/loyalty/ledger";
import { rewardCodeExpiry } from "~/lib/loyalty/points";
import { isUniqueConstraintError } from "~/lib/prisma-errors";

/**
 * A redemption failure the caller is expected to handle and translate for the
 * customer, as opposed to an unexpected throw:
 *
 * - `tier_not_found` — the tier id doesn't exist, is inactive, or belongs to
 *   another business (the owner deleted or disabled it between page load and
 *   click; `LoyaltyRewardTier` is rows-not-JSON precisely so this fails
 *   cleanly instead of silently redeeming a *different* reward).
 * - `insufficient_points` — the balance didn't cover the tier at the moment
 *   of the write.
 * - `code_collision` — three generated codes in a row already existed. With a
 *   32-character alphabet and 6 characters that is ~10^9 codes per store;
 *   three consecutive collisions means something is wrong, not unlucky.
 */
export class LoyaltyError extends Error {
  constructor(
    public code: "tier_not_found" | "insufficient_points" | "code_collision",
    message: string,
  ) {
    super(message);
    this.name = "LoyaltyError";
  }
}

/** How many fresh reward codes to try before giving up on a collision. */
const MAX_CODE_ATTEMPTS = 3;

export type RedeemResult = {
  ledgerId: string;
  balanceAfter: number;
  discountCode: {
    id: string;
    code: string;
    type: string;
    value: number;
    expiresAt: Date | null;
    minPurchase: number | null;
  };
  tier: { id: string; label: string; pointsCost: number };
};

/**
 * Spends `tier.pointsCost` points and mints the customer a single-use
 * (`usageLimit: 1`, `perCustomerLimit: 1`) `DiscountCode` marked
 * `source: "loyalty"`, all in one transaction.
 *
 * **The race guard is the conditional UPDATE**, not a read-then-write check:
 * step 2 decrements only `WHERE loyaltyPoints >= pointsCost`, and a
 * `count === 0` means the balance didn't cover it. Two concurrent redeems of
 * the last 500 points therefore cannot both succeed — the second one's
 * `WHERE` no longer matches and it fails `insufficient_points`. Reading the
 * balance first and comparing in JS would let both through.
 *
 * This is the ONE place besides `awardPoints` that writes
 * `Customer.loyaltyPoints`, and it is deliberate: `awardPoints` has to read
 * the balance before writing (to clamp), which is exactly the read-then-write
 * shape this path must avoid. The ledger row is still written in the same
 * transaction, so the invariant "every balance change has a ledger row"
 * holds.
 *
 * A P2002 on the minted code (another store code already uses it) retries the
 * whole transaction up to {@link MAX_CODE_ATTEMPTS} times — the rollback
 * returns the points, so a retry re-spends them rather than double-spending.
 * `LoyaltyError`s are never retried.
 */
export async function redeemRewardTier(
  db: DbClient,
  args: {
    businessId: string;
    customerId: string;
    tierId: string;
    expiryDays: number;
    now?: Date;
  },
): Promise<RedeemResult> {
  const now = args.now ?? new Date();

  for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt++) {
    try {
      return await db.$transaction(async (tx): Promise<RedeemResult> => {
        const tier = await tx.loyaltyRewardTier.findFirst({
          where: {
            id: args.tierId,
            businessId: args.businessId,
            active: true,
            // A zero-cost tier would match `loyaltyPoints >= 0` for everyone
            // and mint unlimited codes; the invariant lives with the money,
            // not only in the admin validator.
            pointsCost: { gt: 0 },
          },
        });
        if (!tier) {
          throw new LoyaltyError(
            "tier_not_found",
            "That reward is no longer available.",
          );
        }

        // The race guard — see the docblock. A zero count also covers "no such
        // customer" and "customer belongs to another business"; all three are
        // reported as insufficient_points because the customer-facing outcome
        // is identical and distinguishing them would require a second read
        // that tells an attacker whether an id exists.
        const spent = await tx.customer.updateMany({
          where: {
            id: args.customerId,
            businessId: args.businessId,
            loyaltyPoints: { gte: tier.pointsCost },
          },
          data: { loyaltyPoints: { decrement: tier.pointsCost } },
        });
        if (spent.count === 0) {
          throw new LoyaltyError(
            "insufficient_points",
            "Not enough points to redeem this reward.",
          );
        }

        const balanceAfter = await getBalance(tx, args.customerId);

        const discountCode = await tx.discountCode.create({
          data: {
            businessId: args.businessId,
            code: generateRewardCode(),
            type: tier.type,
            value: tier.value,
            active: true,
            usageLimit: 1,
            perCustomerLimit: 1,
            expiresAt: rewardCodeExpiry(now, args.expiryDays),
            minPurchase: tier.minPurchase,
            source: "loyalty",
          },
          select: {
            id: true,
            code: true,
            type: true,
            value: true,
            expiresAt: true,
            minPurchase: true,
          },
        });

        const ledger = await tx.loyaltyLedger.create({
          data: {
            businessId: args.businessId,
            customerId: args.customerId,
            type: "redeem",
            points: -tier.pointsCost,
            balanceAfter,
            sourceKey: `redeem:${discountCode.id}`,
            discountCodeId: discountCode.id,
            reason: tier.label,
            metadata: { tierId: tier.id },
          },
          select: { id: true },
        });

        return {
          ledgerId: ledger.id,
          balanceAfter,
          discountCode,
          tier: {
            id: tier.id,
            label: tier.label,
            pointsCost: tier.pointsCost,
          },
        };
      });
    } catch (error) {
      // Business outcomes are final — the transaction already rolled back and
      // retrying would produce the same answer.
      if (error instanceof LoyaltyError) throw error;
      if (attempt < MAX_CODE_ATTEMPTS && isCodeCollision(error)) continue;
      throw error;
    }
  }

  throw new LoyaltyError(
    "code_collision",
    "Could not generate a unique reward code. Please try again.",
  );
}

/**
 * Whether `error` is a unique-constraint violation on the minted discount
 * code, i.e. worth retrying with a fresh code.
 *
 * The only other unique constraints reachable inside the redeem transaction
 * are `LoyaltyLedger`'s `([businessId, sourceKey])` and `discountCodeId`, and
 * both are derived from the just-created code's fresh cuid, so neither can
 * collide. When Prisma gives us no `meta.target` to inspect we therefore
 * treat any P2002 here as the code collision it almost certainly is —
 * worst case we burn a retry and then rethrow.
 */
function isCodeCollision(error: unknown): boolean {
  if (!isUniqueConstraintError(error)) return false;

  const target: unknown = (error as { meta?: { target?: unknown } }).meta
    ?.target;

  // Postgres reports the constraint as a string; other connectors report an
  // array of field names. Anything else (including a missing target) is an
  // unrecognized shape and is treated as a collision.
  if (typeof target === "string") return namesCode(target);
  if (Array.isArray(target)) {
    return target.some(
      (field) => typeof field === "string" && namesCode(field),
    );
  }
  return true;
}

/** Whether a constraint name or field name refers to a discount code. */
function namesCode(value: string): boolean {
  return value.toLowerCase().includes("code");
}
