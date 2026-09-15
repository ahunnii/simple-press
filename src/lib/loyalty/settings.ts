/**
 * Loyalty Rewards — program settings shapes, defaults, and public
 * projections. Local structural types stand in for the Prisma models
 * (`LoyaltyProgram`, `LoyaltyRewardTier`) until the client is regenerated —
 * do not import from `generated/prisma` here.
 */

import { formatPrice } from "~/lib/prices";

import {
  LOYALTY_SOCIAL_LABELS,
  LOYALTY_SOCIAL_NETWORKS,
  LOYALTY_TIER_TYPES,
  type LoyaltySocialNetwork,
  type LoyaltyTierType,
} from "./constants";

/** Structural mirror of the `LoyaltyProgram` Prisma model's own fields (id/timestamps/relations excluded). */
export type LoyaltyProgramSettings = {
  earnOnOrders: boolean;
  pointsPerDollar: number;
  signupEnabled: boolean;
  signupBonus: number;
  firstOrderEnabled: boolean;
  firstOrderBonus: number;
  birthdayEnabled: boolean;
  birthdayBonus: number;
  socialEnabled: boolean;
  socialFollowBonus: number;
  rewardCodeExpiryDays: number;
};

/** Structural mirror of a `LoyaltyRewardTier` row. */
export type LoyaltyTierRow = {
  id: string;
  label: string;
  pointsCost: number;
  type: string;
  value: number;
  minPurchase: number | null;
  sortOrder: number;
  active: boolean;
};

/**
 * The settings a brand-new business gets before it has ever saved
 * `/admin/settings/loyalty`. Must match the `@default(...)` values on the
 * `LoyaltyProgram` Prisma model exactly (see the "LOYALTY / REWARDS" section
 * of `prisma/schema.prisma`) — a divergence here would make the in-memory
 * default (used before a row exists) disagree with what Prisma actually
 * writes on first save.
 */
export const DEFAULT_LOYALTY_PROGRAM: LoyaltyProgramSettings = {
  earnOnOrders: true,
  pointsPerDollar: 1,
  signupEnabled: false,
  signupBonus: 0,
  firstOrderEnabled: false,
  firstOrderBonus: 0,
  birthdayEnabled: false,
  birthdayBonus: 0,
  socialEnabled: false,
  socialFollowBonus: 0,
  rewardCodeExpiryDays: 90,
};

/** The shape of a redemption tier as exposed to the storefront/public API — no internal ids beyond the tier's own, no `sortOrder`/`active` bookkeeping. */
export type PublicLoyaltyTier = {
  id: string;
  label: string;
  pointsCost: number;
  type: LoyaltyTierType;
  value: number;
  minPurchase: number | null;
};

/** The full public projection returned by `quoteCalculator`-style "public program" read procedures. */
export type PublicLoyaltyProgram = {
  rules: LoyaltyProgramSettings;
  tiers: PublicLoyaltyTier[];
};

/**
 * Projects a program + its tiers for the storefront. Only `active` tiers are
 * included, sorted by `sortOrder` then `pointsCost` (matching the owner's
 * intended display order, with points cost as a stable tiebreaker); a tier
 * whose `type` isn't a recognized {@link LoyaltyTierType} is dropped rather
 * than surfaced as `undefined`-shaped data. Consumed by the public "get my
 * program" read path.
 */
export function toPublicProgram(
  program: LoyaltyProgramSettings,
  tiers: LoyaltyTierRow[],
): PublicLoyaltyProgram {
  const knownTypes: readonly string[] = LOYALTY_TIER_TYPES;

  const publicTiers: PublicLoyaltyTier[] = tiers
    .filter((tier) => tier.active && knownTypes.includes(tier.type))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.pointsCost - b.pointsCost)
    .map((tier) => ({
      id: tier.id,
      label: tier.label,
      pointsCost: tier.pointsCost,
      type: tier.type as LoyaltyTierType,
      value: tier.value,
      minPurchase: tier.minPurchase,
    }));

  return { rules: { ...program }, tiers: publicTiers };
}

/**
 * Which of a business's `SiteContent.socialLinks` are usable as a
 * social-follow claim target: a non-empty string that parses as an http(s)
 * URL, for each network in canonical ({@link LOYALTY_SOCIAL_NETWORKS}) order.
 * Consumed by the storefront social-follow claim UI (only shows a button for
 * a network the owner actually linked) and `claimSocialSchema`'s server-side
 * companion (rejects a claim for a network with no configured link).
 *
 * `socialLinks` is `unknown` because it comes straight off a Prisma `Json?`
 * column — anything that isn't a plain object (null, an array, a string,
 * etc.) yields `[]` rather than throwing.
 */
export function availableSocialNetworks(
  socialLinks: unknown,
): Array<{ network: LoyaltySocialNetwork; label: string; url: string }> {
  if (
    typeof socialLinks !== "object" ||
    socialLinks === null ||
    Array.isArray(socialLinks)
  ) {
    return [];
  }

  const record = socialLinks as Record<string, unknown>;
  const result: Array<{
    network: LoyaltySocialNetwork;
    label: string;
    url: string;
  }> = [];

  for (const network of LOYALTY_SOCIAL_NETWORKS) {
    const value = record[network];
    if (typeof value !== "string" || value.length === 0) continue;

    try {
      const parsed = new URL(value);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        continue;
      }
    } catch {
      continue;
    }

    result.push({ network, label: LOYALTY_SOCIAL_LABELS[network], url: value });
  }

  return result;
}

/**
 * Human-readable description of a redemption tier's reward, e.g. `"15% off"`
 * or `"$5.00 off"`. Consumed by the admin tiers table and the storefront
 * redeem UI.
 */
export function describeTierReward(tier: {
  type: string;
  value: number;
}): string {
  if (tier.type === "percentage") return `${tier.value}% off`;
  if (tier.type === "fixed") return `${formatPrice(tier.value)} off`;
  return "";
}
