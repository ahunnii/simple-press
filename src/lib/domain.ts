// lib/domain.ts

/**
 * Get the current domain from request headers
 */
export function getCurrentDomain(headers: Headers): string {
  const host = headers.get("host") ?? "";
  return host;
}

/**
 * Get business by any domain type
 */
export async function getBusinessByDomain(domain: string) {
  const { db } = await import("~/server/db");

  // Extract subdomain if it's on main platform
  const subdomain = extractSubdomain(domain);

  if (subdomain) {
    // Search by subdomain
    return db.business.findUnique({
      where: { subdomain },
    });
  } else {
    // Search by custom domain
    return db.business.findFirst({
      where: {
        OR: [
          { customDomain: domain },
          { customDomain: domain.replace(/:\d+$/, "") }, // Remove port for dev
        ],
      },
    });
  }
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
