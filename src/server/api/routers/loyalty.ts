import { randomUUID } from "node:crypto";
import type { LoyaltyProgram } from "generated/prisma";
import * as Sentry from "@sentry/nextjs";
import { TRPCError } from "@trpc/server";

import type { LoyaltyProgramSettings } from "~/lib/loyalty/settings";
import type { DbClient } from "~/server/db";
import { checkBusiness } from "~/lib/check-business";
import { sendLoyaltyRewardRedeemedEmail } from "~/lib/email/templates";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { resolveFlags } from "~/lib/features/resolve-flags";
import {
  ensureLoyaltyCustomer,
  LoyaltyCustomerConflictError,
} from "~/lib/loyalty/customer";
import { awardPoints, getBalance, listLedger } from "~/lib/loyalty/ledger";
import { LoyaltyError, redeemRewardTier } from "~/lib/loyalty/redeem";
import {
  availableSocialNetworks,
  DEFAULT_LOYALTY_PROGRAM,
  describeTierReward,
  toPublicProgram,
} from "~/lib/loyalty/settings";
import { getClientIpFromHeaders, loyaltyActionLimiter } from "~/lib/rate-limit";
import {
  adjustPointsSchema,
  birthdaySchema,
  claimSocialSchema,
  customerLedgerQuerySchema,
  loyaltyProgramSettingsSchema,
  redeemSchema,
} from "~/lib/validators/loyalty";
import {
  createTRPCRouter,
  featureGate,
  ownerAdminProcedure,
  protectedProcedure,
  staffProcedure,
} from "~/server/api/trpc";

/**
 * `loyalty` router — Loyalty Rewards.
 *
 * Gating philosophy — same split as `subscription.ts` and `quickbooks.ts`:
 * the `loyalty` feature flag toggles NEW earn/redeem activity, never an
 * owner's ability to read balances/history or correct one, and never a
 * customer's ability to see a balance they already have.
 *
 *  - `getSettings` (admin read) and `getCustomerLedger` (staff read) are
 *    UNGATED — reading settings or a customer's points history is never
 *    destructive and must survive the flag being off.
 *  - `adjustPoints` (owner manual grant/clawback) is UNGATED — a correction
 *    must always be possible, same reasoning as the subscription admin
 *    `cancel` mutation: money/points records never disappear when a flag
 *    toggles.
 *  - `updateSettings` (owner turns on rules / edits tiers) is GATED — this is
 *    new configuration, not an existing record.
 *  - `getMine` (signed-in customer read) is UNGATED — a customer who already
 *    has a balance must always be able to see it; the response's own
 *    `flags.loyalty` tells the storefront UI whether to offer ways to earn
 *    more.
 *  - `join`, `updateBirthday`, `claimSocial`, `redeem` are GATED — all four
 *    are new customer-initiated activity (joining, claiming, spending
 *    points).
 *  - `redeem` additionally requires the `coupons` feature at RUNTIME (not via
 *    `featureGate`, since the message needs to name the other feature by
 *    name) — a reward code IS a `DiscountCode`, and minting one while coupon
 *    redemption itself is off would hand out a code checkout can never
 *    honor.
 *
 * Every customer-facing procedure resolves the tenant via `checkBusiness()`
 * (mirroring `customer.ts`) and then scopes the `Customer` row to
 * `{ businessId, userId: ctx.session.user.id }` — a foreign `tierId` or
 * `customerId` must surface as NOT_FOUND, never leak whether it exists on
 * another tenant.
 */

/** Resolves the request-host tenant or throws NOT_FOUND. */
async function resolveTenant() {
  const business = await checkBusiness();
  if (!business) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Business not found" });
  }
  return business;
}

/**
 * `ensureLoyaltyCustomer` throws a plain `Error` when the email's existing
 * `Customer` row belongs to a different user — see its docblock. Every
 * customer-facing entry point that joins/claims/updates loyalty state maps
 * that to a CONFLICT rather than a 500.
 */
async function resolveLoyaltyCustomer(
  db: DbClient,
  businessId: string,
  user: { id: string; email: string; name?: string | null },
) {
  try {
    return await ensureLoyaltyCustomer(db, { businessId, user });
  } catch (err) {
    // Only the typed ownership conflict is a client-facing 409. Anything
    // else is unexpected and must stay a 500 so the tRPC onError handler
    // captures it (it deliberately ignores CONFLICT) and no raw Prisma
    // message reaches the browser.
    if (err instanceof LoyaltyCustomerConflictError) {
      throw new TRPCError({ code: "CONFLICT", message: err.message });
    }
    throw err;
  }
}

/** Consumes the shared loyalty-action rate limit; surfaces as TOO_MANY_REQUESTS. */
async function consumeLoyaltyLimiter(
  headers: Headers,
  businessId: string,
): Promise<void> {
  try {
    await loyaltyActionLimiter.consume(
      `${getClientIpFromHeaders(headers)}:${businessId}`,
    );
  } catch {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests. Please try again later.",
    });
  }
}

/** Projects a `LoyaltyProgram` row onto the plain settings shape both read paths return. */
function toProgramSettings(program: LoyaltyProgram): LoyaltyProgramSettings {
  return {
    earnOnOrders: program.earnOnOrders,
    pointsPerDollar: program.pointsPerDollar,
    signupEnabled: program.signupEnabled,
    signupBonus: program.signupBonus,
    firstOrderEnabled: program.firstOrderEnabled,
    firstOrderBonus: program.firstOrderBonus,
    birthdayEnabled: program.birthdayEnabled,
    birthdayBonus: program.birthdayBonus,
    socialEnabled: program.socialEnabled,
    socialFollowBonus: program.socialFollowBonus,
    rewardCodeExpiryDays: program.rewardCodeExpiryDays,
  };
}

/** `{ loyalty, coupons }` for a business already resolved to an id (owner-session procedures). */
async function loadFlags(
  db: DbClient,
  businessId: string,
): Promise<{ loyalty: boolean; coupons: boolean }> {
  const business = await db.business.findUnique({
    where: { id: businessId },
    select: { featureFlags: true },
  });
  const { isEnabled } = resolveFlags(business?.featureFlags);
  return { loyalty: isEnabled("loyalty"), coupons: isEnabled("coupons") };
}

/** Shared `getSettings`/`updateSettings` response shape. */
async function loadSettingsResponse(db: DbClient, businessId: string) {
  const [program, siteContent, flags] = await Promise.all([
    db.loyaltyProgram.findUnique({
      where: { businessId },
      include: {
        tiers: { orderBy: [{ sortOrder: "asc" }, { pointsCost: "asc" }] },
      },
    }),
    db.siteContent.findUnique({
      where: { businessId },
      select: { socialLinks: true },
    }),
    loadFlags(db, businessId),
  ]);

  return {
    program: program ? toProgramSettings(program) : DEFAULT_LOYALTY_PROGRAM,
    tiers: program?.tiers ?? [],
    exists: !!program,
    socialNetworksAvailable: availableSocialNetworks(siteContent?.socialLinks),
    flags,
  };
}

export const loyaltyRouter = createTRPCRouter({
  // ---------------------------------------------------------------- admin

  getSettings: ownerAdminProcedure.query(({ ctx }) =>
    loadSettingsResponse(ctx.db, ctx.businessId),
  ),

  updateSettings: ownerAdminProcedure
    .use(featureGate("loyalty"))
    .input(loyaltyProgramSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const { tiers, ...settings } = input;

      await ctx.db.$transaction(async (tx) => {
        const program = await tx.loyaltyProgram.upsert({
          where: { businessId },
          create: { businessId, ...settings },
          update: settings,
        });

        const existingTiers = await tx.loyaltyRewardTier.findMany({
          where: { programId: program.id },
          select: { id: true },
        });
        const existingIds = new Set(existingTiers.map((t) => t.id));

        // Only an id that ACTUALLY belongs to this program counts as "kept" —
        // an id from another program (or one that never existed) is silently
        // treated as a new tier below, never as an update or a delete target.
        const keepIds = new Set(
          tiers
            .map((t) => t.id)
            .filter((id): id is string => !!id && existingIds.has(id)),
        );
        const idsToDelete = [...existingIds].filter((id) => !keepIds.has(id));
        if (idsToDelete.length > 0) {
          await tx.loyaltyRewardTier.deleteMany({
            where: { id: { in: idsToDelete } },
          });
        }

        for (const [index, tier] of tiers.entries()) {
          const { id, ...data } = tier;
          if (id && existingIds.has(id)) {
            await tx.loyaltyRewardTier.update({
              where: { id },
              data: { ...data, sortOrder: index },
            });
          } else {
            await tx.loyaltyRewardTier.create({
              data: {
                ...data,
                programId: program.id,
                businessId,
                sortOrder: index,
              },
            });
          }
        }
      });

      return loadSettingsResponse(ctx.db, businessId);
    }),

  getCustomerLedger: staffProcedure
    .input(customerLedgerQuerySchema)
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const customer = await ctx.db.customer.findFirst({
        where: { id: input.customerId, businessId },
        select: {
          loyaltyPoints: true,
          birthMonth: true,
          birthDay: true,
          loyaltyJoinedAt: true,
        },
      });
      if (!customer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Customer not found",
        });
      }

      const entries = await listLedger(ctx.db, {
        businessId,
        customerId: input.customerId,
        take: input.take,
      });

      return {
        balance: customer.loyaltyPoints,
        birthday:
          customer.birthMonth !== null && customer.birthDay !== null
            ? { month: customer.birthMonth, day: customer.birthDay }
            : null,
        joinedAt: customer.loyaltyJoinedAt,
        entries,
      };
    }),

  adjustPoints: ownerAdminProcedure
    .input(adjustPointsSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const customer = await ctx.db.customer.findFirst({
        where: { id: input.customerId, businessId },
        select: { id: true },
      });
      if (!customer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Customer not found",
        });
      }

      const result = await awardPoints(ctx.db, {
        businessId,
        customerId: input.customerId,
        type: "adjust",
        points: input.points,
        sourceKey: `adjust:${randomUUID()}`,
        reason: input.reason,
        actorUserId: ctx.session.user.id,
        clampToBalance: true,
      });

      if (!result.awarded) {
        // `input.points` is validated non-zero and `sourceKey` is a fresh
        // UUID every call, so the only way `awardPoints` can report failure
        // here is the clamp reducing a deduction to 0 — the customer already
        // has no points to take back.
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Customer has no points to deduct",
        });
      }

      return { balance: result.balanceAfter };
    }),

  // ------------------------------------------------------------- customer

  getMine: protectedProcedure.query(async ({ ctx }) => {
    const business = await resolveTenant();
    const businessId = business.id;
    const userId = ctx.session.user.id;

    const [bizRow, program, customer] = await Promise.all([
      ctx.db.business.findUnique({
        where: { id: businessId },
        select: {
          featureFlags: true,
          siteContent: { select: { socialLinks: true } },
        },
      }),
      ctx.db.loyaltyProgram.findUnique({
        where: { businessId },
        include: { tiers: true },
      }),
      ctx.db.customer.findFirst({ where: { businessId, userId } }),
    ]);

    const { isEnabled } = resolveFlags(bizRow?.featureFlags);
    const flags = {
      loyalty: isEnabled("loyalty"),
      coupons: isEnabled("coupons"),
    };

    // Three scoped reads rather than deriving everything from one paginated
    // activity feed: a customer with 50+ ledger rows must still see every
    // reward code they paid for and never be offered a "Claim" they already
    // used. `entries` stays a 50-row activity list.
    const [entries, redeemRows, socialRows] = customer
      ? await Promise.all([
          listLedger(ctx.db, {
            businessId,
            customerId: customer.id,
            take: 50,
          }),
          ctx.db.loyaltyLedger.findMany({
            where: { businessId, customerId: customer.id, type: "redeem" },
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              createdAt: true,
              reason: true,
              discountCode: {
                select: {
                  code: true,
                  expiresAt: true,
                  usageCount: true,
                  active: true,
                },
              },
            },
          }),
          ctx.db.loyaltyLedger.findMany({
            where: {
              businessId,
              customerId: customer.id,
              type: "social_follow",
            },
            select: { sourceKey: true },
          }),
        ])
      : [[], [], []];

    const codes = redeemRows.flatMap((e) => {
      if (!e.discountCode) return [];
      return [
        {
          id: e.id,
          createdAt: e.createdAt,
          code: e.discountCode.code,
          expiresAt: e.discountCode.expiresAt,
          usageCount: e.discountCode.usageCount,
          active: e.discountCode.active,
          reason: e.reason,
        },
      ];
    });

    const claimedKeys = new Set(socialRows.map((r) => r.sourceKey));
    const social = availableSocialNetworks(
      bizRow?.siteContent?.socialLinks,
    ).map((n) => ({
      ...n,
      claimed: customer
        ? claimedKeys.has(`social:${customer.id}:${n.network}`)
        : false,
    }));

    return {
      flags,
      program: program
        ? toPublicProgram(toProgramSettings(program), program.tiers)
        : null,
      customer: customer
        ? {
            id: customer.id,
            loyaltyPoints: customer.loyaltyPoints,
            loyaltyJoinedAt: customer.loyaltyJoinedAt,
            birthMonth: customer.birthMonth,
            birthDay: customer.birthDay,
          }
        : null,
      // Customer-safe projection: no `sourceKey`, `metadata` (award rate,
      // eligible cents) or `actorUserId` (the admin who adjusted) leaves the
      // server. The admin ledger (`getCustomerLedger`) returns the full rows.
      // `reason` on an `adjust` row is the owner's free-text note from the
      // admin dialog and may be internal ("chargeback abuser"); it never
      // reaches the customer. Every other type's reason is system-written.
      entries: entries.map((e) => ({
        id: e.id,
        createdAt: e.createdAt,
        type: e.type,
        points: e.points,
        balanceAfter: e.balanceAfter,
        reason: e.type === "adjust" ? null : e.reason,
      })),
      codes,
      social,
    };
  }),

  join: protectedProcedure
    .use(featureGate("loyalty"))
    .mutation(async ({ ctx }) => {
      const business = await resolveTenant();
      const customer = await resolveLoyaltyCustomer(
        ctx.db,
        business.id,
        ctx.session.user,
      );

      if (!customer.loyaltyJoinedAt) {
        await ctx.db.customer.update({
          where: { id: customer.id },
          data: { loyaltyJoinedAt: new Date() },
        });
      }

      const program = await ctx.db.loyaltyProgram.findUnique({
        where: { businessId: business.id },
      });

      let awarded = 0;
      if (program?.signupEnabled && program.signupBonus > 0) {
        const result = await awardPoints(ctx.db, {
          businessId: business.id,
          customerId: customer.id,
          type: "signup_bonus",
          points: program.signupBonus,
          sourceKey: `signup:${customer.id}`,
          reason: "Welcome bonus",
        });
        if (result.awarded) awarded = result.points;
      }

      const balance = await getBalance(ctx.db, customer.id);
      return { balance, awarded };
    }),

  updateBirthday: protectedProcedure
    .use(featureGate("loyalty"))
    .input(birthdaySchema)
    .mutation(async ({ ctx, input }) => {
      const business = await resolveTenant();
      const customer = await resolveLoyaltyCustomer(
        ctx.db,
        business.id,
        ctx.session.user,
      );

      await ctx.db.customer.update({
        where: { id: customer.id },
        data: { birthMonth: input.month, birthDay: input.day },
      });

      return { month: input.month, day: input.day };
    }),

  claimSocial: protectedProcedure
    .use(featureGate("loyalty"))
    .input(claimSocialSchema)
    .mutation(async ({ ctx, input }) => {
      const business = await resolveTenant();
      await consumeLoyaltyLimiter(ctx.headers, business.id);

      const [program, siteContent] = await Promise.all([
        ctx.db.loyaltyProgram.findUnique({
          where: { businessId: business.id },
        }),
        ctx.db.siteContent.findUnique({
          where: { businessId: business.id },
          select: { socialLinks: true },
        }),
      ]);

      if (!program?.socialEnabled || program.socialFollowBonus <= 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Social rewards are not available",
        });
      }

      const match = availableSocialNetworks(siteContent?.socialLinks).find(
        (n) => n.network === input.network,
      );
      if (!match) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That network isn't set up for this store",
        });
      }

      const customer = await resolveLoyaltyCustomer(
        ctx.db,
        business.id,
        ctx.session.user,
      );

      const result = await awardPoints(ctx.db, {
        businessId: business.id,
        customerId: customer.id,
        type: "social_follow",
        points: program.socialFollowBonus,
        sourceKey: `social:${customer.id}:${input.network}`,
        reason: match.label,
        metadata: { network: input.network },
      });

      if (!result.awarded) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Already claimed",
        });
      }

      return { balance: result.balanceAfter, awarded: result.points };
    }),

  redeem: protectedProcedure
    .use(featureGate("loyalty"))
    .input(redeemSchema)
    .mutation(async ({ ctx, input }) => {
      const business = await resolveTenant();
      await consumeLoyaltyLimiter(ctx.headers, business.id);

      // Runtime check rather than `featureGate("coupons")`: the message needs
      // to name the OTHER feature the owner must turn on, and a `FORBIDDEN`
      // from a second `featureGate` would be indistinguishable from the
      // `loyalty` flag itself being off.
      const { isEnabled } = await getBusinessFlags();
      if (!isEnabled("coupons")) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Reward codes need the Discount Codes feature turned on — ask the store owner.",
        });
      }

      const customer = await ctx.db.customer.findFirst({
        where: { businessId: business.id, userId: ctx.session.user.id },
      });
      if (!customer) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Join the rewards program first",
        });
      }

      const program = await ctx.db.loyaltyProgram.findUnique({
        where: { businessId: business.id },
      });
      const expiryDays =
        program?.rewardCodeExpiryDays ??
        DEFAULT_LOYALTY_PROGRAM.rewardCodeExpiryDays;

      let result;
      try {
        result = await redeemRewardTier(ctx.db, {
          businessId: business.id,
          customerId: customer.id,
          tierId: input.tierId,
          expiryDays,
        });
      } catch (err) {
        if (err instanceof LoyaltyError) {
          if (err.code === "tier_not_found") {
            throw new TRPCError({ code: "NOT_FOUND", message: err.message });
          }
          if (err.code === "insufficient_points") {
            throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: err.message,
          });
        }
        throw err;
      }

      // Best-effort confirmation email — the redemption above already
      // committed (points spent, code minted, ledger row written). A failure
      // here must never undo it; same rule as every order-lifecycle email.
      try {
        const emailBusiness = await ctx.db.business.findUnique({
          where: { id: business.id },
          select: {
            name: true,
            ownerEmail: true,
            subdomain: true,
            customDomain: true,
            domainStatus: true,
            siteContent: { select: { logoUrl: true } },
          },
        });
        if (emailBusiness) {
          await sendLoyaltyRewardRedeemedEmail({
            to: customer.email,
            customerName:
              [customer.firstName, customer.lastName]
                .filter(Boolean)
                .join(" ") || null,
            code: result.discountCode.code,
            rewardLabel: result.tier.label,
            rewardDescription: describeTierReward(result.discountCode),
            expiresAt: result.discountCode.expiresAt,
            minPurchaseCents: result.discountCode.minPurchase,
            pointsSpent: result.tier.pointsCost,
            balance: result.balanceAfter,
            discountCodeId: result.discountCode.id,
            business: emailBusiness,
          });
        }
      } catch (err) {
        Sentry.withScope((scope) => {
          scope.setTag("trpc.procedure", "loyalty.redeem");
          scope.setTag("service", "resend");
          scope.setTag("businessId", business.id);
          Sentry.captureException(err);
        });
      }

      return {
        code: result.discountCode.code,
        expiresAt: result.discountCode.expiresAt,
        balance: result.balanceAfter,
        rewardLabel: result.tier.label,
      };
    }),
});
