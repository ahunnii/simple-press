// lib/domain-utils.ts
//
// Pure, client-safe domain/URL helpers. This module must NOT import server-only
// code (e.g. `~/server/db`), so it can be safely pulled into client bundles.
// Server-only domain logic (DB lookups) lives in `~/lib/domain`.

/**
 * Get the current domain from request headers
 */
export function getCurrentDomain(headers: Headers): string {
  const host = headers.get("host") ?? "";
  return host;
}

/**
 * Extract subdomain from domain
 * Returns null if on main platform or custom domain
 */
export function extractSubdomain(domain: string): string | null {
  const mainDomain = getMainDomain();

  // Remove port for comparison
  const cleanDomain = domain.replace(/:\d+$/, "");
  const cleanMain = mainDomain.replace(/:\d+$/, "");

  // Check if on main domain
  if (cleanDomain === cleanMain) {
    return null;
  }

  // Check if subdomain of main
  if (cleanDomain.endsWith(`.${cleanMain}`)) {
    return cleanDomain.replace(`.${cleanMain}`, "");
  }

  // Must be custom domain
  return null;
}

/**
 * Strict host → business matcher for Prisma `where` clauses.
 *
 * Platform hosts (subdomains of the main domain) match by subdomain label;
 * any other host matches `customDomain` exactly. The two must never be OR'd
 * together: for a custom-domain host like `bloom.florist.com`, an OR on
 * `subdomain: "bloom"` can resolve a *different* tenant whose subdomain
 * happens to be `bloom`.
 */
export function businessHostFilter(
  hostname: string,
): { subdomain: string } | { customDomain: string } {
  const subdomain = extractSubdomain(hostname);
  if (subdomain) {
    return { subdomain };
  }
  return { customDomain: hostname.replace(/:\d+$/, "") };
}

/**
 * Get main platform domain
 */
export function getMainDomain(): string {
  const isDev = process.env.NODE_ENV === "development";
  return isDev
    ? (process.env.NEXT_PUBLIC_DEV_DOMAIN ?? "localhost:3000")
    : process.env.NEXT_PUBLIC_PLATFORM_DOMAIN!;
}

/**
 * Build full URL for any domain type
 */
export function buildDomainUrl(
  business: {
    subdomain: string;
    customDomain: string | null;
    domainStatus?: string;
  },
  path = "/",
): string {
  const isDev = process.env.NODE_ENV === "development";

  // Prefer custom domain if active
  if (business.customDomain && business.domainStatus === "active") {
    return `https://${business.customDomain}${path}`;
  }

  // Fall back to subdomain
  const mainDomain = getMainDomain();
  const protocol = isDev ? "http" : "https";

  return `${protocol}://${business.subdomain}.${mainDomain}${path}`;
}

/**
 * Get OAuth callback URL (always main domain)
 */
export function getCallbackUrl(): string {
  const isDev = process.env.NODE_ENV === "development";
  const mainDomain = getMainDomain();
  const protocol = isDev ? "http" : "https";

  return `${protocol}://${mainDomain}/api/stripe/connect/callback`;
}

/**
 * Encode OAuth state with return URL (base64url for URL safety)
 */
export function encodeOAuthState(data: {
  businessId: string;
  returnUrl: string;
}): string {
  const json = JSON.stringify(data);
  const base64 = Buffer.from(json).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Decode OAuth state
 */
export function decodeOAuthState(encoded: string): {
  businessId: string;
  returnUrl: string;
} {
  let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  base64 += "=".repeat((4 - (base64.length % 4)) % 4);
  const json = Buffer.from(base64, "base64").toString("utf-8");
  return JSON.parse(json) as {
    businessId: string;
    returnUrl: string;
  };
}
