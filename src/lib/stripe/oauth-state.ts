import { createHmac } from "crypto";

import { env } from "~/env";

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

/**
 * Business identity needed to decide which hosts an OAuth `returnUrl` is
 * allowed to point at. Deliberately loose (`domainStatus?: string | null`) so
 * callers can hand in whatever their own Prisma `select` produced — same
 * shape convention as `~/lib/canonical.ts` / `~/lib/business-url.ts`.
 */
export interface OAuthReturnUrlBusiness {
  subdomain: string;
  customDomain: string | null;
  domainStatus?: string | null;
}

export interface IsAllowedReturnUrlOptions {
  /** Defaults to `env.NEXT_PUBLIC_PLATFORM_DOMAIN`. */
  platformDomain?: string;
  /**
   * Also allow `http://localhost`, `http://*.localhost`, and
   * `http://127.0.0.1` (any port). This helper never inspects `NODE_ENV`
   * itself — callers must pass `process.env.NODE_ENV !== "production"` so a
   * caller that forgets the flag fails closed instead of silently trusting
   * dev hosts in a deployed build.
   */
  allowInsecureLocalhost?: boolean;
}

/**
 * Is `returnUrl` a host this business's OAuth connect flow (Stripe Connect,
 * QuickBooks) is allowed to redirect back to?
 *
 * Both `/api/stripe/connect/state` and `/api/quickbooks/connect/state` sign
 * a caller-supplied `returnUrl` into the OAuth state, and both callbacks
 * `new URL(returnUrl)` on every branch — success, `?error=`, token-exchange
 * failure, etc. Without this check, any OWNER/MANAGER of any store could mint
 * a validly-signed state pointing `returnUrl` at an attacker-controlled host,
 * turning the callback into an open redirector.
 *
 * The allowed hosts mirror the "trusted host" rule already used elsewhere for
 * a business: the platform domain itself, `<subdomain>.<platformDomain>`, and
 * — same as `~/lib/auth/allowed-hosts.ts`, `~/lib/captcha/known-hosts.ts`,
 * `~/lib/canonical.ts`, and `~/lib/business-url.ts` — a `customDomain` ONLY
 * once DNS has actually been verified (`domainStatus === "ACTIVE"`). A
 * `PENDING_DNS` domain is a string the owner typed into a form, not a host
 * anyone can reach an authenticated session on, so a legitimate admin session
 * is never rejected by requiring ACTIVE here.
 *
 * Every comparison is against `url.hostname` (never `url.host`, which would
 * bake the port into the match) using strict equality — never
 * `.endsWith`/`.includes` — since a suffix/substring check is exactly how
 * `https://shop.simplepress.co.evil.com/` or
 * `https://evil.com/?x=shop.simplepress.co` would sneak past a naive matcher.
 */
export function isAllowedReturnUrl(
  returnUrl: string,
  business: OAuthReturnUrlBusiness,
  opts: IsAllowedReturnUrlOptions = {},
): boolean {
  let url: URL;
  try {
    url = new URL(returnUrl);
  } catch {
    return false;
  }

  // Userinfo lets an attacker smuggle a trusted-looking label in front of the
  // real (attacker-controlled) host, e.g. `https://shop.simplepress.co@evil.com/`.
  if (url.username !== "" || url.password !== "") return false;

  const hostname = url.hostname.toLowerCase();
  const platformDomain = (
    opts.platformDomain ?? env.NEXT_PUBLIC_PLATFORM_DOMAIN
  ).toLowerCase();
  const allowInsecureLocalhost = opts.allowInsecureLocalhost ?? false;

  const isLocalhostHost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost");

  if (allowInsecureLocalhost && isLocalhostHost) {
    return url.protocol === "http:" || url.protocol === "https:";
  }

  if (url.protocol !== "https:") return false;

  if (hostname === platformDomain) return true;

  if (hostname === `${business.subdomain.toLowerCase()}.${platformDomain}`) {
    return true;
  }

  if (
    business.customDomain &&
    business.domainStatus === "ACTIVE" &&
    hostname === business.customDomain.toLowerCase()
  ) {
    return true;
  }

  return false;
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
