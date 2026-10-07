/**
 * Server-safe helper to build a ZoneWeightConfig from a Business row.
 * Used by both the Stripe checkout session route and the shipping.quote
 * tRPC procedure so the zone+weight math has a single source of truth.
 *
 * It also owns the Sentry reporting for zone+weight fallbacks. That lives here
 * rather than in shipping-utils.ts because shipping-utils is imported by ~20
 * storefront cart/checkout CLIENT components (for `calculateShipping`), and
 * pulling `@sentry/nextjs` into it would follow them into the browser bundle and
 * cost `calculateZoneWeightShipping` its "unit-testable with no Sentry" status.
 * This module is server-only — the two call sites below are its only importers.
 */

import * as Sentry from "@sentry/nextjs";

import type { ZoneWeightFallbackInfo } from "~/lib/shipping-utils";

// `buildZoneWeightConfig` / `parseWeightTiers` live in the Sentry-free
// `~/lib/shipping-zone-config` (so pure SEO code can reuse them) and are
// re-exported here so existing importers are unchanged.
export {
  buildZoneWeightConfig,
  parseWeightTiers,
} from "~/lib/shipping-zone-config";

// ─────────────────────────────────────────────────────────────────────────────
// Zone+weight shipping fallbacks → Sentry
// ─────────────────────────────────────────────────────────────────────────────
//
// `calculateZoneWeightShipping` is total: it always returns a number and never
// rejects, so its four fallback branches are completely silent. Each one is
// store misconfiguration, not shopper error — a country the matrix cannot price,
// a state no zone lists, a weight tier `parseWeightTiers` dropped for being
// malformed, a hole in the rate matrix — and in all four the shopper is quoted
// `fallbackRateCents` with no trace in the logs, the order record, or the admin.
// The two outcomes are charging someone $99.99 for a t-shirt (they abandon, and
// the owner reads it as "nobody's buying") or, when the saved fallback is $0,
// shipping worldwide for free. Nothing here changes either number — this only
// makes them visible.
//
// Why throttle: `shipping.quote` is a public, unauthenticated procedure that
// runs live as the shopper picks their state. A misconfigured store therefore
// hits the same branch on every quote, for every shopper, for as long as it
// stays misconfigured — unthrottled that is thousands of events which Sentry
// folds into the single issue it was always going to show us. The signal we act
// on is "this store falls back, here, for this reason", not the count of
// shoppers who hit it. One event per store+source+reason per 15 minutes keeps
// the issue open and its `lastSeen` honest while capping the bill. Throttle
// state is per server process — with several instances the worst case is a few
// duplicate events per window, which is fine.
const ZONE_WEIGHT_FALLBACK_WINDOW_MS = 15 * 60 * 1000;

// Bounded by (stores served by this process × 2 sources × 4 reasons), so small
// in practice — but this module lives for the life of the process, so it gets a
// hard cap anyway. Cleared wholesale rather than evicting the oldest entry: the
// only consequence of losing the map is at most one extra event per key, which
// is not worth the bookkeeping of an LRU.
const MAX_TRACKED_FALLBACKS = 500;
const lastFallbackReport = new Map<string, number>();

/**
 * Which call site hit the fallback. Part of the throttle key as well as the
 * tags: the quote path fires first and far more often, so a shared key would
 * let it mask the checkout path — and a fallback that survives to checkout is
 * money the shopper actually paid, not a preview they walked away from.
 */
export type ZoneWeightFallbackSource =
  | "shipping.quote"
  | "stripe.create-session"
  | "stripe.subscriptions.create-session";

/**
 * Report a zone+weight fallback, throttled per store + source + reason.
 * Wired in as `calculateZoneWeightShipping`'s `onFallback` by the two callers
 * that have a resolved `businessId`.
 */
export function reportZoneWeightFallback(
  info: ZoneWeightFallbackInfo,
  ctx: { businessId: string; source: ZoneWeightFallbackSource },
): void {
  const key = `${ctx.businessId}:${ctx.source}:${info.reason}`;
  const now = Date.now();
  if (now - (lastFallbackReport.get(key) ?? 0) < ZONE_WEIGHT_FALLBACK_WINDOW_MS)
    return;
  if (lastFallbackReport.size >= MAX_TRACKED_FALLBACKS)
    lastFallbackReport.clear();
  lastFallbackReport.set(key, now);

  // A fallback of exactly 0 is a different failure from a fallback of $99.99.
  // $99.99 is a mispriced quote: bad, but the shopper still decides whether to
  // pay it, and the money that moves is the store's own. 0 is free shipping to
  // a destination the store could not price at all — the order sails through,
  // the owner silently eats the carrier cost on every one of them, and nothing
  // in the order record says why. That is a live revenue leak rather than a bad
  // quote, so it goes out at `error` instead of sitting in the warning stream.
  const level = info.fallbackRateCents === 0 ? "error" : "warning";

  console.warn(
    `[Shipping] zone+weight fallback (${info.reason}) → ${info.fallbackRateCents} cents [${ctx.source}] business ${ctx.businessId}`,
  );

  Sentry.captureMessage(`Shipping fell back to flat rate: ${info.reason}`, {
    level,
    tags: {
      service: "shipping",
      "shipping.fallback": info.reason,
      businessId: ctx.businessId,
      route: ctx.source,
    },
    extra: {
      // Destination codes only. A state/country says where the parcel goes, not
      // who is buying — the shopper's street address, name and email never come
      // near this (`sendDefaultPii` is false).
      destinationCountry: info.destinationCountry,
      destinationState: info.destinationState,
      totalWeightLb: info.totalWeightLb,
      // What the shopper is being charged for shipping, in cents.
      fallbackRateCents: info.fallbackRateCents,
      // Both 0 is the tell for a matrix that was never filled in at all, vs. a
      // matrix that simply doesn't cover this destination.
      zoneCount: info.zoneCount,
      weightTierCount: info.weightTierCount,
      // `missing-rate-cell` only — names the exact cell the owner must fill in.
      matchedZoneName: info.matchedZoneName,
      tierIndex: info.tierIndex,
    },
  });
}
