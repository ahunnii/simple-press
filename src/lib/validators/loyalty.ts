import { z } from "zod";

import { isValidBirthday } from "~/lib/loyalty/birthday";
import {
  LOYALTY_LEDGER_PAGE,
  LOYALTY_SOCIAL_NETWORKS,
  LOYALTY_TIER_TYPES,
  MAX_ADJUST_POINTS,
  MAX_LOYALTY_TIERS,
  type LoyaltySocialNetwork,
  type LoyaltyTierType,
} from "~/lib/loyalty/constants";
import { DISCOUNT_PERCENTAGE_MAX_ERROR } from "~/lib/validators/discounts";

/**
 * One redemption tier as submitted by the admin tiers editor. `id` is
 * omitted for a brand-new tier the owner hasn't saved yet. Percentage tiers
 * are bounded to 1–100 (reusing the discount code's percentage-cap message,
 * since it's the same "whole percent, 1–100" rule); fixed tiers must be
 * worth at least one cent — a `value: 0` fixed reward isn't a reward.
 */
export const loyaltyTierInputSchema = z
  .object({
    id: z.string().cuid().optional(),
    label: z.string().trim().min(1).max(60),
    pointsCost: z.number().int().min(1).max(1_000_000),
    type: z.enum(
      LOYALTY_TIER_TYPES as unknown as [LoyaltyTierType, ...LoyaltyTierType[]],
    ),
    value: z.number().int().min(0),
    minPurchase: z.number().int().min(0).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "percentage" && (data.value < 1 || data.value > 100)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: DISCOUNT_PERCENTAGE_MAX_ERROR,
        path: ["value"],
      });
    }
    if (data.type === "fixed" && data.value < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Fixed reward must be at least 1 cent",
        path: ["value"],
      });
    }
  });

export type LoyaltyTierInput = z.infer<typeof loyaltyTierInputSchema>;

/**
 * Full `/admin/settings/loyalty` save payload: every `LoyaltyProgramSettings`
 * field plus the tier list. Consumed by the (not-yet-written)
 * `loyaltyProgram.update`-style tRPC mutation.
 */
export const loyaltyProgramSettingsSchema = z.object({
  earnOnOrders: z.boolean(),
  pointsPerDollar: z.number().int().min(0).max(1000),
  signupEnabled: z.boolean(),
  signupBonus: z.number().int().min(0).max(1_000_000),
  firstOrderEnabled: z.boolean(),
  firstOrderBonus: z.number().int().min(0).max(1_000_000),
  birthdayEnabled: z.boolean(),
  birthdayBonus: z.number().int().min(0).max(1_000_000),
  socialEnabled: z.boolean(),
  socialFollowBonus: z.number().int().min(0).max(1_000_000),
  rewardCodeExpiryDays: z.number().int().min(1).max(365),
  tiers: z.array(loyaltyTierInputSchema).max(MAX_LOYALTY_TIERS),
});

export type LoyaltyProgramSettingsInput = z.infer<
  typeof loyaltyProgramSettingsSchema
>;

/**
 * Admin manual points adjustment input. `points` may be positive (grant) or
 * negative (deduct) but never zero, and is capped at
 * {@link MAX_ADJUST_POINTS} in either direction to keep a fat-fingered entry
 * from corrupting a customer's balance. Consumed by the `adjust` tRPC
 * mutation that writes an `adjust` ledger row.
 */
export const adjustPointsSchema = z.object({
  customerId: z.string().min(1),
  points: z
    .number()
    .int()
    .refine((n) => n !== 0, "Points can't be zero")
    .refine(
      (n) => Math.abs(n) <= MAX_ADJUST_POINTS,
      `Points must be at most ${MAX_ADJUST_POINTS} in absolute value`,
    ),
  reason: z.string().trim().min(1).max(200),
});

export type AdjustPointsInput = z.infer<typeof adjustPointsSchema>;

/** Storefront "I followed you" claim input. Consumed by the `claimSocial` tRPC mutation. */
export const claimSocialSchema = z.object({
  network: z.enum(
    LOYALTY_SOCIAL_NETWORKS as unknown as [
      LoyaltySocialNetwork,
      ...LoyaltySocialNetwork[],
    ],
  ),
});

export type ClaimSocialInput = z.infer<typeof claimSocialSchema>;

/**
 * A customer's saved birthday (month/day only — no year, since the bonus
 * repeats annually). Rejects a day that doesn't exist in that month (e.g.
 * April 31st) via {@link isValidBirthday}; February 29th is accepted
 * year-agnostically. Consumed by the account-preferences "save my birthday"
 * mutation.
 */
export const birthdaySchema = z
  .object({
    month: z.number().int().min(1).max(12),
    day: z.number().int().min(1).max(31),
  })
  .refine(({ month, day }) => isValidBirthday(month, day), {
    message: "That day doesn't exist in that month",
    path: ["day"],
  });

export type BirthdayInput = z.infer<typeof birthdaySchema>;

/** Storefront redemption input. Consumed by the `redeem` tRPC mutation. */
export const redeemSchema = z.object({
  tierId: z.string().min(1),
});

export type RedeemInput = z.infer<typeof redeemSchema>;

/**
 * Paginated ledger read input for a customer's points history. `take`
 * defaults to {@link LOYALTY_LEDGER_PAGE}. Consumed by both the admin
 * customer-detail ledger card and the storefront account points history.
 */
export const customerLedgerQuerySchema = z.object({
  customerId: z.string().min(1),
  take: z.number().int().min(1).max(200).default(LOYALTY_LEDGER_PAGE),
});

export type CustomerLedgerQueryInput = z.infer<
  typeof customerLedgerQuerySchema
>;
