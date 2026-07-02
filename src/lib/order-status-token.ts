import { createHmac, timingSafeEqual } from "crypto";

import { env } from "~/env";

// ~90 days — long enough to cover the full lifecycle of an order
// (confirmation → fulfillment → returns window).
const TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;

type OrderStatusTokenPayload = {
  orderId: string;
  exp: number;
};

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
 * Create a signed, URL-safe order-status token.
 * Payload is base64url-encoded JSON; signature is HMAC-SHA256 over it.
 * Format: <base64url-payload>.<base64url-sig>
 */
export function createOrderStatusToken(
  orderId: string,
  secret: string = env.SIMPLEPRESS_HASH_SECRET,
): string {
  const payload: OrderStatusTokenPayload = {
    orderId,
    exp: Date.now() + TOKEN_TTL_MS,
  };

  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  const sig = sign(encodedPayload, secret);

  return `${encodedPayload}.${sig}`;
}

/**
 * Verify and decode a signed order-status token.
 * Returns the payload if valid and unexpired, or null if tampered/expired.
 */
export function verifyOrderStatusToken(
  token: string,
  secret: string = env.SIMPLEPRESS_HASH_SECRET,
): { orderId: string } | null {
  const dotIndex = token.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const encodedPayload = token.slice(0, dotIndex);
  const receivedSig = token.slice(dotIndex + 1);

  // Recompute expected signature
  const expectedSig = sign(encodedPayload, secret);

  // Constant-time comparison to prevent timing attacks
  const receivedBuf = Buffer.from(receivedSig);
  const expectedBuf = Buffer.from(expectedSig);
  if (
    receivedBuf.length !== expectedBuf.length ||
    !timingSafeEqual(receivedBuf, expectedBuf)
  ) {
    return null;
  }

  let payload: OrderStatusTokenPayload;
  try {
    payload = JSON.parse(
      base64urlDecode(encodedPayload),
    ) as OrderStatusTokenPayload;
  } catch {
    return null;
  }

  if (
    typeof payload.orderId !== "string" ||
    payload.orderId.length === 0 ||
    typeof payload.exp !== "number"
  ) {
    return null;
  }

  if (Date.now() > payload.exp) return null;

  return { orderId: payload.orderId };
}
