import { createHmac } from "crypto";

const STATE_TTL_MS = 15 * 60 * 1000; // 15 minutes

type OAuthStatePayload = {
  businessId: string;
  returnUrl: string;
  exp: number;
};

/**
 * Create a signed OAuth state string.
 * Payload is base64url-encoded JSON; signature is HMAC-SHA256 over it.
 * Format: <base64url-payload>.<base64url-sig>
 */
export function createSignedOAuthState(
  data: { businessId: string; returnUrl: string },
  secret: string,
): string {
  const payload: OAuthStatePayload = {
    businessId: data.businessId,
    returnUrl: data.returnUrl,
    exp: Date.now() + STATE_TTL_MS,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const sig = createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${encodedPayload}.${sig}`;
}

/**
 * Verify and decode a signed OAuth state string.
 * Returns the payload if valid and unexpired, or null if tampered/expired.
 */
export function verifySignedOAuthState(
  encoded: string,
  secret: string,
): { businessId: string; returnUrl: string } | null {
  const dotIndex = encoded.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const encodedPayload = encoded.slice(0, dotIndex);
  const receivedSig = encoded.slice(dotIndex + 1);

  // Recompute expected signature
  const expectedSig = createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  // Constant-time comparison to prevent timing attacks
  if (
    receivedSig.length !== expectedSig.length ||
    !timingSafeEqual(receivedSig, expectedSig)
  ) {
    return null;
  }

  let payload: OAuthStatePayload;
  try {
    let base64 = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
    base64 += "=".repeat((4 - (base64.length % 4)) % 4);
    payload = JSON.parse(
      Buffer.from(base64, "base64").toString("utf-8"),
    ) as OAuthStatePayload;
  } catch {
    return null;
  }

  if (Date.now() > payload.exp) return null;

  return { businessId: payload.businessId, returnUrl: payload.returnUrl };
}

function timingSafeEqual(a: string, b: string): boolean {
  // Buffer-based constant-time comparison
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) {
    diff |= (bufA[i] ?? 0) ^ (bufB[i] ?? 0);
  }
  return diff === 0;
}
