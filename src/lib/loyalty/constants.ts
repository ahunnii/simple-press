/**
 * Loyalty Rewards — shared constants and unions.
 *
 * Pure, dependency-free module. No DB import — `LoyaltyLedger.type` and
 * `LoyaltyRewardTier.type` are plain `String` columns in `prisma/schema.prisma`
 * (see the "LOYALTY / REWARDS" section there); these tuples are the single
 * source of truth both the pure helpers in this directory and the eventual
 * server-side ledger/settings code (`src/lib/loyalty/ledger.ts`) validate
 * against.
 */

/**
 * Every `LoyaltyLedger.type` value. Mirrors the comment on the `LoyaltyLedger`
 * Prisma model field-for-field — keep the two in sync.
 */
export const LOYALTY_LEDGER_TYPES = [
  "order_earn",
  "first_order_bonus",
  "signup_bonus",
  "birthday_bonus",
  "social_follow",
  "order_clawback",
  "redeem",
  "adjust",
] as const;
export type LoyaltyLedgerType = (typeof LOYALTY_LEDGER_TYPES)[number];

/** Owner-facing labels for `LoyaltyLedgerType`, used by the admin ledger table. */
export const LOYALTY_LEDGER_TYPE_LABELS: Record<LoyaltyLedgerType, string> = {
  order_earn: "Order",
  first_order_bonus: "First order bonus",
  signup_bonus: "Signup bonus",
  birthday_bonus: "Birthday bonus",
  social_follow: "Social follow",
  order_clawback: "Refund adjustment",
  redeem: "Redeemed",
  adjust: "Manual adjustment",
};

/** Mirrors the keys of `socialLinksSchema` in src/lib/validators/content.ts. */
export const LOYALTY_SOCIAL_NETWORKS = [
  "instagram",
  "facebook",
  "twitter",
  "linkedin",
  "tiktok",
  "pinterest",
  "youtube",
] as const;
export type LoyaltySocialNetwork = (typeof LOYALTY_SOCIAL_NETWORKS)[number];

/** Owner-facing labels for `LoyaltySocialNetwork`, used by the social-follow claim UI. */
export const LOYALTY_SOCIAL_LABELS: Record<LoyaltySocialNetwork, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  twitter: "X (Twitter)",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  pinterest: "Pinterest",
  youtube: "YouTube",
};

/** Prefix for generated reward codes, e.g. `RWD-7F3K9Q`. */
export const REWARD_CODE_PREFIX = "RWD-";
/** Number of random characters generated after {@link REWARD_CODE_PREFIX}. */
export const REWARD_CODE_LENGTH = 6;
/** Alphabet used to generate reward codes — excludes 0/O/1/I to avoid visual ambiguity. */
export const REWARD_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Absolute cap on a single manual points adjustment (either direction). */
export const MAX_ADJUST_POINTS = 1_000_000;
/** Maximum number of redemption tiers a program may define. */
export const MAX_LOYALTY_TIERS = 20;
/** Default page size for a customer's points ledger. */
export const LOYALTY_LEDGER_PAGE = 50;

/** Every `LoyaltyRewardTier.type` value. */
export const LOYALTY_TIER_TYPES = ["percentage", "fixed"] as const;
export type LoyaltyTierType = (typeof LOYALTY_TIER_TYPES)[number];
