/**
 * Subscription cadence catalog. Five fixed cadences the owner can enable per
 * product (see `Product.subscriptionIntervals` and the plan's "Locked
 * decisions" table) — never arbitrary Stripe `interval`/`interval_count`
 * pairs from user input. Pure, no I/O.
 */

/** The five subscription cadences SimplePress supports. */
export type SubscriptionIntervalKey =
  | "week:1"
  | "week:2"
  | "month:1"
  | "month:2"
  | "month:3";

/** Stripe's `recurring.interval` values used by our cadence catalog. */
export type SubscriptionStripeInterval = "week" | "month";

export interface SubscriptionIntervalCatalogEntry {
  key: SubscriptionIntervalKey;
  interval: SubscriptionStripeInterval;
  intervalCount: number;
  label: string;
  shortLabel: string;
}

/**
 * The full cadence catalog, in the canonical display/storage order. Every
 * other export in this module is derived from this array so there is exactly
 * one place that defines "what cadences exist."
 */
export const SUBSCRIPTION_INTERVALS: readonly SubscriptionIntervalCatalogEntry[] =
  [
    {
      key: "week:1",
      interval: "week",
      intervalCount: 1,
      label: "Every week",
      shortLabel: "Weekly",
    },
    {
      key: "week:2",
      interval: "week",
      intervalCount: 2,
      label: "Every 2 weeks",
      shortLabel: "Every 2 weeks",
    },
    {
      key: "month:1",
      interval: "month",
      intervalCount: 1,
      label: "Every month",
      shortLabel: "Monthly",
    },
    {
      key: "month:2",
      interval: "month",
      intervalCount: 2,
      label: "Every 2 months",
      shortLabel: "Every 2 months",
    },
    {
      key: "month:3",
      interval: "month",
      intervalCount: 3,
      label: "Every 3 months",
      shortLabel: "Every 3 months",
    },
  ];

/** Just the keys, in catalog order — used for zod enums and UI option lists. */
export const SUBSCRIPTION_INTERVAL_KEYS: readonly SubscriptionIntervalKey[] =
  SUBSCRIPTION_INTERVALS.map((entry) => entry.key);

/** Look up a catalog entry by key. Returns `undefined` for an unknown key — never throws. */
export function getInterval(
  key: SubscriptionIntervalKey,
): SubscriptionIntervalCatalogEntry | undefined {
  return SUBSCRIPTION_INTERVALS.find((entry) => entry.key === key);
}

/** Type guard: is `value` one of the five known cadence keys? */
export function isSubscriptionIntervalKey(
  value: unknown,
): value is SubscriptionIntervalKey {
  return (
    typeof value === "string" &&
    SUBSCRIPTION_INTERVAL_KEYS.includes(value as SubscriptionIntervalKey)
  );
}

/**
 * Parse `Product.subscriptionIntervals` (an untrusted Prisma `Json` column)
 * into a de-duplicated, catalog-ordered list of valid cadence keys. Anything
 * that isn't an array, and any entry that isn't a recognized key, is
 * silently dropped rather than throwing — this runs on every product read.
 */
export function parseProductIntervals(
  json: unknown,
): SubscriptionIntervalKey[] {
  if (!Array.isArray(json)) return [];

  const found = new Set<SubscriptionIntervalKey>();
  for (const entry of json) {
    if (isSubscriptionIntervalKey(entry)) {
      found.add(entry);
    }
  }

  return SUBSCRIPTION_INTERVAL_KEYS.filter((key) => found.has(key));
}
