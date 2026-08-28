import { createHmac, timingSafeEqual } from "crypto";

import { env } from "~/env";

// 180 days — the manage link is emailed on every subscription event
// (started, renewal confirmation, payment failed, cancelled, updated) and
// must keep working for the life of a long-running subscription without the
// customer needing an account. Longer than the 90-day order-status TTL
// because a subscription, unlike an order, has no natural end date.
const TOKEN_TTL_MS = 180 * 24 * 60 * 60 * 1000;

type SubscriptionTokenPayload = {
  /** Discriminator, so a subscription token can never be replayed against order-status verification (or vice versa). */
  k: "sub";
  /** Subscription row id. */
  sid: string;
  /** Business id the subscription belongs to — checked against `checkBusiness()` on every use. */
  bid: string;
  exp: number;
};

export interface SubscriptionTokenSubject {
  subscriptionId: string;
  businessId: string;
}

function base64urlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(input: string): string {
  let base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  base64 += "=".repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(base64, "base64").toString("utf-8");
}

function sign(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Create a signed, URL-safe subscription-manage token — the same mechanics
 * as `order-status-token.ts` (base64url JSON payload + HMAC-SHA256
 * signature), with a `k: "sub"` discriminator and a 180-day TTL. Embedded in
 * every subscription email and the `/subscriptions/[token]` manage link.
 */
export function createSubscriptionToken(
  subject: SubscriptionTokenSubject,
  secret: string = env.SIMPLEPRESS_HASH_SECRET,
): string {
  const payload: SubscriptionTokenPayload = {
    k: "sub",
    sid: subject.subscriptionId,
    bid: subject.businessId,
    exp: Date.now() + TOKEN_TTL_MS,
  };

  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  const sig = sign(encodedPayload, secret);

  return `${encodedPayload}.${sig}`;
}

/**
 * Verify and decode a subscription-manage token. Returns the subject
 * (`subscriptionId`/`businessId`) if valid and unexpired, or `null` if
 * tampered, expired, or malformed — never throws.
 */
export function verifySubscriptionToken(
  token: string,
  secret: string = env.SIMPLEPRESS_HASH_SECRET,
): SubscriptionTokenSubject | null {
  const dotIndex = token.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const encodedPayload = token.slice(0, dotIndex);
  const receivedSig = token.slice(dotIndex + 1);

  const expectedSig = sign(encodedPayload, secret);

  const receivedBuf = Buffer.from(receivedSig);
  const expectedBuf = Buffer.from(expectedSig);
  if (
    receivedBuf.length !== expectedBuf.length ||
    !timingSafeEqual(receivedBuf, expectedBuf)
  ) {
    return null;
  }

  let payload: SubscriptionTokenPayload;
  try {
    payload = JSON.parse(
      base64urlDecode(encodedPayload),
    ) as SubscriptionTokenPayload;
  } catch {
    return null;
  }

  if (
    payload.k !== "sub" ||
    typeof payload.sid !== "string" ||
    payload.sid.length === 0 ||
    typeof payload.bid !== "string" ||
    payload.bid.length === 0 ||
    typeof payload.exp !== "number"
  ) {
    return null;
  }

  if (Date.now() > payload.exp) return null;

  return { subscriptionId: payload.sid, businessId: payload.bid };
}
