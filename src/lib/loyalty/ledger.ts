/**
 * Loyalty Rewards — the single write path for points.
 *
 * `awardPoints` is the ONLY place (with one documented exception, see
 * `redeemRewardTier` in `./redeem.ts`) that writes `Customer.loyaltyPoints`.
 * Every balance change is paired with an append-only `LoyaltyLedger` row
 * inside one transaction, so the running balance and its history can never
 * drift apart.
 *
 * Idempotency is structural, not advisory: `LoyaltyLedger` carries
 * `@@unique([businessId, sourceKey])`, the ledger row is inserted BEFORE the
 * balance is touched, and a duplicate `sourceKey` therefore aborts the whole
 * transaction (P2002) with the balance untouched. Replayed Stripe webhooks,
 * the 15-minute cron, and double-clicked buttons all collapse onto that
 * constraint. The `sourceKey` shapes are enumerated on the `LoyaltyLedger`
 * model in `prisma/schema.prisma` — callers build them, this module only
 * enforces uniqueness.
 *
 * A duplicate is a normal, expected outcome (`{ awarded: false, reason:
 * "duplicate" }`) and is deliberately never reported to Sentry — same rule as
 * the Stripe webhook's idempotency skip.
 */

import type { LoyaltyLedger, Prisma } from "generated/prisma";

import type { LoyaltyLedgerType } from "~/lib/loyalty/constants";
import type { DbClient, TxClient } from "~/server/db";
import { LOYALTY_LEDGER_PAGE } from "~/lib/loyalty/constants";
import { isUniqueConstraintError } from "~/lib/prisma-errors";

export type AwardInput = {
  businessId: string;
  customerId: string;
  type: LoyaltyLedgerType;
  /** Positive to award, negative to deduct. 0 → no-op. */
  points: number;
  /** Idempotency key, unique per business (see the LoyaltyLedger docblock). */
  sourceKey: string;
  reason?: string;
  metadata?: Prisma.InputJsonValue;
  orderId?: string;
  discountCodeId?: string;
  actorUserId?: string;
  /** Deductions: clamp at the current balance so it never goes below 0 (default true). */
  clampToBalance?: boolean;
};

export type AwardResult =
  | { awarded: true; points: number; balanceAfter: number; ledgerId: string }
  | { awarded: false; reason: "duplicate" | "zero" };

/**
 * A ledger row as returned by {@link listLedger} — the row plus the reward
 * code it minted, when it was a `redeem`. Structurally a `LoyaltyLedger`, so
 * it satisfies anything typed against the bare model.
 */
export type LoyaltyLedgerEntry = LoyaltyLedger & {
  discountCode: {
    code: string;
    expiresAt: Date | null;
    usageCount: number;
    active: boolean;
  } | null;
};

/**
 * Writes one `LoyaltyLedger` row and applies the same delta to
 * `Customer.loyaltyPoints`, atomically.
 *
 * Order inside the transaction matters and is load-bearing: the ledger row is
 * created FIRST so that a duplicate `sourceKey` raises P2002 before any
 * balance write happens. Reversing these two statements would still be
 * correct (the transaction rolls back either way) but would leave the balance
 * update as the first write, which is the shape that goes wrong the moment
 * someone converts this to two separate calls.
 *
 * `balanceAfter` on the row is a best-effort SNAPSHOT taken from the read at
 * the top of the transaction. Under `READ COMMITTED` (Postgres' default) a
 * concurrent award can interleave, so two rows may record the same
 * `balanceAfter`. The row's signed `points` and the atomic `{ increment }` on
 * `Customer.loyaltyPoints` are the truth; `balanceAfter` is a human-readable
 * convenience for the admin ledger table. Never reconcile against it.
 *
 * Deductions (`points < 0`) clamp at the current balance by default so a
 * clawback can't push a customer negative. A balance that is somehow already
 * negative clamps the deduction to 0 rather than flipping sign. Pass
 * `clampToBalance: false` for a deliberate manual adjustment that is allowed
 * to go below zero.
 *
 * Throws if the customer does not belong to `businessId` — that is a caller
 * bug (a cross-tenant id reached this function), not a runtime condition.
 */
export async function awardPoints(
  db: DbClient,
  input: AwardInput,
): Promise<AwardResult> {
  if (input.points === 0) return { awarded: false, reason: "zero" };

  const clamp = input.clampToBalance ?? true;

  try {
    return await db.$transaction(async (tx): Promise<AwardResult> => {
      const customer = await tx.customer.findUniqueOrThrow({
        where: { id: input.customerId },
        select: { businessId: true, loyaltyPoints: true },
      });

      if (customer.businessId !== input.businessId) {
        throw new Error(
          "Loyalty award refused: customer belongs to another business",
        );
      }

      const balance = customer.loyaltyPoints;
      // `Math.max(0, balance)` guards an already-negative balance: without it
      // `Math.min(-5, 100)` would yield -5 and `applied` would come out
      // POSITIVE, turning a deduction into an award.
      const applied =
        input.points < 0 && clamp
          ? -Math.min(Math.max(0, balance), -input.points)
          : input.points;

      if (applied === 0) return { awarded: false, reason: "zero" };

      const balanceAfter = balance + applied;

      const row = await tx.loyaltyLedger.create({
        data: {
          businessId: input.businessId,
          customerId: input.customerId,
          type: input.type,
          points: applied,
          balanceAfter,
          sourceKey: input.sourceKey,
          ...(input.reason !== undefined ? { reason: input.reason } : {}),
          ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
          ...(input.orderId !== undefined ? { orderId: input.orderId } : {}),
          ...(input.discountCodeId !== undefined
            ? { discountCodeId: input.discountCodeId }
            : {}),
          ...(input.actorUserId !== undefined
            ? { actorUserId: input.actorUserId }
            : {}),
        },
        select: { id: true },
      });

      await tx.customer.update({
        where: { id: input.customerId },
        data: { loyaltyPoints: { increment: applied } },
      });

      return {
        awarded: true,
        points: applied,
        balanceAfter,
        ledgerId: row.id,
      };
    });
  } catch (error) {
    // Expected: the same sourceKey already landed. Not an error, not a Sentry
    // event — the caller asked for an effect that has already happened.
    if (isUniqueConstraintError(error)) {
      return { awarded: false, reason: "duplicate" };
    }
    throw error;
  }
}

/**
 * The customer's current points balance, or 0 when the customer does not
 * exist (an anonymized/deleted row is worth zero points, not an exception).
 */
export async function getBalance(
  db: DbClient | TxClient,
  customerId: string,
): Promise<number> {
  const customer = await db.customer.findUnique({
    where: { id: customerId },
    select: { loyaltyPoints: true },
  });
  return customer?.loyaltyPoints ?? 0;
}

/**
 * A customer's ledger, newest first. Scoped by `businessId` as well as
 * `customerId` so a cross-tenant id can never read another store's history.
 * The minted reward code is joined in for `redeem` rows so the storefront can
 * show "RWD-7F3K9Q — expires March 2" without a second query.
 */
export async function listLedger(
  db: DbClient | TxClient,
  opts: { businessId: string; customerId: string; take?: number },
): Promise<LoyaltyLedgerEntry[]> {
  return db.loyaltyLedger.findMany({
    where: { businessId: opts.businessId, customerId: opts.customerId },
    orderBy: { createdAt: "desc" },
    take: opts.take ?? LOYALTY_LEDGER_PAGE,
    include: {
      discountCode: {
        select: {
          code: true,
          expiresAt: true,
          usageCount: true,
          active: true,
        },
      },
    },
  });
}

/**
 * Total points already clawed back for an order, as a POSITIVE number
 * (`order_clawback` rows store a negative `points`). Feeds `alreadyClawed` in
 * `clawbackPoints`, which is what keeps a partial refund followed by a full
 * refund from deducting more than the order ever earned.
 *
 * Summed in JS rather than via `aggregate` because the stored values are
 * negative and the consumer wants the absolute total; doing the `Math.abs`
 * here keeps the sign convention in exactly one place.
 */
export async function sumClawedForOrder(
  db: DbClient | TxClient,
  businessId: string,
  orderId: string,
): Promise<number> {
  const rows = await db.loyaltyLedger.findMany({
    where: { businessId, orderId, type: "order_clawback" },
    select: { points: true },
  });
  return rows.reduce((sum, row) => sum + Math.abs(row.points), 0);
}

/**
 * Points awarded by the `order:<orderId>` earn row, or 0 if the order never
 * earned (loyalty was off, the program didn't exist, the order had no
 * eligible value). Read through the `businessId_sourceKey` unique index, so
 * this is a single index lookup.
 */
export async function getEarnedForOrder(
  db: DbClient | TxClient,
  businessId: string,
  orderId: string,
): Promise<number> {
  const row = await db.loyaltyLedger.findUnique({
    where: {
      businessId_sourceKey: { businessId, sourceKey: `order:${orderId}` },
    },
    select: { points: true },
  });
  return row?.points ?? 0;
}
