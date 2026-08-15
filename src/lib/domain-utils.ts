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
 * Build a full URL to the main platform domain (no subdomain) — e.g. for
 * cross-host links from the platform-admin subdomain into a tenant's
 * `/admin/*` routes, which don't exist under `platform.*`.
 */
export function getMainDomainUrl(path = "/"): string {
  const isDev = process.env.NODE_ENV === "development";
  const mainDomain = getMainDomain();
  const protocol = isDev ? "http" : "https";

  return `${protocol}://${mainDomain}${path}`;
}

/**
 * Build a full URL to the dedicated platform-admin subdomain (`platform.*`),
 * which serves `src/app/platform-hub` via a middleware rewrite (see
 * `isPlatformSubdomain` in `src/middleware.ts`). Used for nav/notification
 * links that must resolve on the platform subdomain regardless of which
 * tenant admin or environment they're rendered from.
 */
export function getPlatformHubUrl(path = "/"): string {
  const isDev = process.env.NODE_ENV === "development";
  const mainDomain = getMainDomain();
  const protocol = isDev ? "http" : "https";

  return `${protocol}://platform.${mainDomain}${path}`;
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
