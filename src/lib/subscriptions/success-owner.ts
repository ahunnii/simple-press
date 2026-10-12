import type { Subscription } from "generated/prisma";
import * as Sentry from "@sentry/nextjs";

import {
  legacyBareCookieAllowed,
  matchPendingSessionCookie,
  SUBSCRIPTION_PENDING_COOKIE,
  withinLegacyCookieAge,
} from "~/lib/checkout/pending-session-cookie";
import { stripeClient } from "~/lib/stripe/client";
import { db } from "~/server/db";

/**
 * `/subscribe/success`'s ownership check: the local `Subscription` row for
 * `sessionId` in this store, ONLY when the request's
 * `pending_subscription_session` cookie proves the visitor started that
 * checkout; null otherwise (no/forged/mismatched/other-store cookie, no row).
 *
 * A SIGNED cookie (what create-session sets) is always enough. A legacy bare
 * cookie (set before the cookie was signed) is accepted only during rollout,
 * under the same `legacyBareCookieAllowed` rule as `/api/stripe/session`
 * (unmarked session, young enough for a bare cookie to still exist).
 */
export async function findOwnedSubscription(opts: {
  headers: Pick<Headers, "get">;
  businessId: string;
  sessionId: string | undefined;
}): Promise<Subscription | null> {
  const { headers, businessId, sessionId } = opts;
  if (!sessionId) return null;

  const cookie = matchPendingSessionCookie(headers, businessId, sessionId, {
    kind: SUBSCRIPTION_PENDING_COOKIE,
  });
  if (!cookie) return null;

  // The store's Stripe account rides along for the legacy path's lookup.
  const row = await db.subscription.findFirst({
    where: { stripeCheckoutSessionId: sessionId, businessId },
    include: { business: { select: { stripeAccountId: true } } },
  });
  if (!row) return null;
  const { business, ...subscription } = row;
  if (cookie.signed) return subscription;

  return (await legacyBareCookieAccepted({
    createdAt: subscription.createdAt,
    stripeAccountId: business.stripeAccountId,
    businessId,
    sessionId,
  }))
    ? subscription
    : null;
}

/** What the fallback needs from a Stripe session; never changes once created. */
type SessionStamp = {
  created: number;
  metadata: Record<string, string> | null;
};

/**
 * Per-instance memo of in-flight/settled session lookups, keyed by store +
 * session. The page is public and unthrottled, so without it anyone who saw a
 * recent session id could replay a bare cookie and spend the store's Stripe
 * read quota once per request. With it, Stripe is asked at most once per
 * recent session per instance (a row must exist in this store and be under
 * the legacy age, which bounds the keys). Failed lookups are evicted so a
 * blip doesn't stick.
 */
const STAMP_CACHE_MAX = 1000;
const stampCache = new Map<string, Promise<SessionStamp>>();

/** Fail fast: this runs inside the success page's render. */
const RETRIEVE_TIMEOUT_MS = 5000;

function retrieveStamp(
  sessionId: string,
  stripeAccount: string,
  businessId: string,
): Promise<SessionStamp> {
  const key = `${businessId}:${sessionId}`;
  const cached = stampCache.get(key);
  if (cached) return cached;

  const pending = stripeClient.checkout.sessions
    .retrieve(
      sessionId,
      {},
      {
        stripeAccount,
        timeout: RETRIEVE_TIMEOUT_MS,
        maxNetworkRetries: 0,
      },
    )
    .then((session) => ({
      created: session.created,
      metadata: session.metadata,
    }));
  pending.catch(() => stampCache.delete(key));

  if (stampCache.size >= STAMP_CACHE_MAX) {
    // Oldest first (Map keeps insertion order).
    const oldest = stampCache.keys().next().value;
    if (oldest !== undefined) stampCache.delete(oldest);
  }
  stampCache.set(key, pending);
  return pending;
}

async function legacyBareCookieAccepted(opts: {
  createdAt: Date;
  stripeAccountId: string | null;
  businessId: string;
  sessionId: string;
}): Promise<boolean> {
  const { createdAt, stripeAccountId, businessId, sessionId } = opts;
  // The row is created moments BEFORE its Stripe session, so its age bounds
  // the session's from above: too old here means too old at Stripe, and any
  // bare cookie for an old row is refused without calling Stripe.
  if (!withinLegacyCookieAge(createdAt.getTime())) return false;
  if (!stripeAccountId) return false;

  // Only the session's creation-time metadata is read — never its payment
  // status — so this cannot race the webhook.
  try {
    const stamp = await retrieveStamp(sessionId, stripeAccountId, businessId);
    return legacyBareCookieAllowed(stamp);
  } catch (error) {
    // Can't tell which cookie format the owner holds: show the generic card.
    // "No such session" is an expected answer for a forged id; anything else
    // (outage, timeout, auth) would silently hide real subscribers' details
    // during rollout, so report it.
    if (
      (error as { type?: unknown } | null)?.type !== "StripeInvalidRequestError"
    ) {
      Sentry.captureException(error, {
        tags: {
          route: "subscribe.success",
          "subscription.step": "legacy-cookie-session-lookup",
          businessId,
        },
        extra: { sessionId },
      });
    }
    return false;
  }
}
