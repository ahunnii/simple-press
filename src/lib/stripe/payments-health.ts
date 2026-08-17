import "server-only";

import * as Sentry from "@sentry/nextjs";

import { stripeClient } from "~/lib/stripe/client";
import { db } from "~/server/db";

/**
 * Whether the connected Stripe account can actually take a charge.
 *
 * - `not-connected` — no `stripeAccountId`; a pre-launch store, not a broken one.
 * - `ok` — charges are enabled.
 * - `charges-disabled` — Stripe has CONFIRMED (live, within the last few
 *   minutes) that charges are disabled on this account. Every checkout fails.
 * - `unknown` — the DB says disabled but Stripe could not be asked just now.
 *   Callers should stay quiet on this: it is a "we don't know", not a "broken".
 */
export type PaymentsHealth =
  | "not-connected"
  | "ok"
  | "charges-disabled"
  | "unknown";

type Verdict = { health: PaymentsHealth; expiresAt: number };

/** Re-ask Stripe about a confirmed-disabled account this often, so recovery shows up without waiting on a webhook. */
const CONFIRMED_DISABLED_TTL_MS = 10 * 60_000;
/** Back off after a failed Stripe read so an outage isn't re-hit from every admin page load. */
const STRIPE_ERROR_TTL_MS = 5 * 60_000;
const MAX_ENTRIES = 500;

// Process-local. Same shape as the checkout Sentry throttle: bounded, cleared
// wholesale past the cap, and allowed to reset on deploy — the worst case after
// a reset is one extra Stripe read per flagged store.
const verdicts = new Map<string, Verdict>();

function remember(businessId: string, health: PaymentsHealth, ttlMs: number) {
  if (verdicts.size >= MAX_ENTRIES) verdicts.clear();
  verdicts.set(businessId, { health, expiresAt: Date.now() + ttlMs });
}

/**
 * Resolve payments health for a business, treating the DB flag as a hint and
 * Stripe as the authority.
 *
 * `Business.stripeChargesEnabled` is `@default(false)` and only ever flips to
 * `true` from the `account.updated` webhook or (since 2026-08-13) the Connect
 * callback. A store connected before that, or one living in an environment
 * that never receives Stripe webhooks (local dev, preview), therefore sits at
 * `false` forever — indistinguishable, in the DB alone, from an account Stripe
 * has actually restricted. Reading the flag literally lit up the "can't accept
 * payments" banner on perfectly healthy stores.
 *
 * So: a `true` is trusted (the webhook flips it back to `false` the moment
 * Stripe restricts the account), but a `false` is VERIFIED against Stripe
 * before anyone is alarmed — and if Stripe says charges are fine, the flag is
 * healed in place so the store never asks again. Only a live, confirmed
 * `charges_enabled: false` produces `charges-disabled`.
 *
 * Cost: one `accounts.retrieve` per flagged store, once — or once per 10 min
 * for a store that really is restricted. Never called for healthy stores.
 */
export async function getPaymentsHealth(business: {
  id: string;
  stripeAccountId: string | null;
  stripeChargesEnabled: boolean;
}): Promise<PaymentsHealth> {
  if (!business.stripeAccountId) return "not-connected";
  if (business.stripeChargesEnabled) return "ok";

  const cached = verdicts.get(business.id);
  if (cached && cached.expiresAt > Date.now()) return cached.health;

  try {
    const account = await stripeClient.accounts.retrieve(
      business.stripeAccountId,
      // Bounded: this runs inside the admin layout render, and a hung Stripe
      // call must not hold every admin page hostage. Timeout → catch → unknown.
      { timeout: 4_000 },
    );
    const chargesEnabled = account.charges_enabled ?? false;

    if (chargesEnabled) {
      // Self-heal the stale flag (and its payouts twin) so this store drops
      // straight back onto the trusted-`true` fast path on the next request.
      await db.business.update({
        where: { id: business.id },
        data: {
          stripeChargesEnabled: true,
          stripePayoutsEnabled: account.payouts_enabled ?? false,
        },
      });
      verdicts.delete(business.id);
      return "ok";
    }

    remember(business.id, "charges-disabled", CONFIRMED_DISABLED_TTL_MS);
    return "charges-disabled";
  } catch (error) {
    // Warning, not error: the store's checkout may well be fine — we simply
    // could not confirm it. Throttled by the cache below rather than per call.
    Sentry.captureException(error, {
      level: "warning",
      tags: {
        service: "stripe",
        "stripe.step": "payments-health",
        businessId: business.id,
      },
    });
    remember(business.id, "unknown", STRIPE_ERROR_TTL_MS);
    return "unknown";
  }
}
