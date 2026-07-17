import { createHmac } from "crypto";

import { env } from "~/env";

type UnsubscribePayload = {
  customerId: string;
  businessId: string;
};

function toBase64Url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) {
    diff |= (bufA[i] ?? 0) ^ (bufB[i] ?? 0);
  }
  return diff === 0;
}

/**
 * Create a permanent (no expiry) HMAC-signed unsubscribe token.
 * Format: <base64url-payload>.<base64url-sig>
 */
export function createUnsubscribeToken({
  customerId,
  businessId,
}: UnsubscribePayload): string {
  const encodedPayload = toBase64Url(
    Buffer.from(JSON.stringify({ customerId, businessId })),
  );

  const sig = toBase64Url(
    createHmac("sha256", env.SIMPLEPRESS_HASH_SECRET)
      .update(encodedPayload)
      .digest(),
  );

  return `${encodedPayload}.${sig}`;
}

/**
 * Verify and decode an unsubscribe token.
 * Returns the payload if valid, or null if tampered/malformed.
 */
export function verifyUnsubscribeToken(
  token: string,
): UnsubscribePayload | null {
  const dotIndex = token.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const encodedPayload = token.slice(0, dotIndex);
  const receivedSig = token.slice(dotIndex + 1);

  const expectedSig = toBase64Url(
    createHmac("sha256", env.SIMPLEPRESS_HASH_SECRET)
      .update(encodedPayload)
      .digest(),
  );

  if (
    receivedSig.length !== expectedSig.length ||
    !timingSafeEqual(receivedSig, expectedSig)
  ) {
    return null;
  }

  try {
    let base64 = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
    base64 += "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(
      Buffer.from(base64, "base64").toString("utf-8"),
    ) as UnsubscribePayload;
  } catch {
    return null;
  }
}
