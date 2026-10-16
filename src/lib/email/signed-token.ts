import { createHmac, timingSafeEqual } from "crypto";

/**
 * Shared mechanics for the stateless email-link tokens in this folder
 * (unsubscribe, newsletter confirmation): `<base64url JSON>.<base64url sig>`,
 * HMAC-SHA256 with SIMPLEPRESS_HASH_SECRET.
 *
 * DOMAIN SEPARATION. The same secret also signs invoice, order-status,
 * subscription and OAuth-state tokens and the pending-session cookies, several
 * of which use this exact `<payload>.<sig>` format. So every token minted here
 * signs `${context}:${encodedPayload}` instead of the bare payload — the same
 * message-prefix idiom as `~/lib/checkout/pending-session-cookie.ts`. A
 * base64url payload never contains ":", so a MAC over a context-prefixed
 * message can never equal one over a bare payload (the legacy format the other
 * token files use), and two distinct contexts can never collide with each
 * other. Contexts carry a version suffix (`unsub:v1`) so a future format change
 * can rotate without ambiguity.
 *
 * `context: null` signs the bare payload — ONLY for verifying legacy tokens
 * minted before domain separation existed. Callers that accept it MUST
 * shape-check the decoded payload, because a legacy-format MAC is also what an
 * invoice/order-status/subscription token carries.
 */

export function base64urlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function base64urlDecode(input: string): string {
  let base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  base64 += "=".repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(base64, "base64").toString("utf-8");
}

function sign(
  encodedPayload: string,
  secret: string,
  context: string | null,
): string {
  const message =
    context === null ? encodedPayload : `${context}:${encodedPayload}`;
  return base64urlEncode(createHmac("sha256", secret).update(message).digest());
}

/** Serialize + sign a payload under a signature context. */
export function createSignedToken(
  payload: unknown,
  secret: string,
  context: string,
): string {
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload, secret, context)}`;
}

/**
 * Check a token's signature under `context` and return its parsed JSON payload
 * (`unknown` — the caller must validate the shape), or `null` when the
 * signature doesn't match or the payload isn't JSON. Never throws.
 */
export function readSignedToken(
  token: string,
  secret: string,
  context: string | null,
): unknown {
  const dotIndex = token.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const encodedPayload = token.slice(0, dotIndex);
  const receivedBuf = Buffer.from(token.slice(dotIndex + 1));
  const expectedBuf = Buffer.from(sign(encodedPayload, secret, context));
  if (
    receivedBuf.length !== expectedBuf.length ||
    !timingSafeEqual(receivedBuf, expectedBuf)
  ) {
    return null;
  }

  try {
    return JSON.parse(base64urlDecode(encodedPayload)) as unknown;
  } catch {
    return null;
  }
}
