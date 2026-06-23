import { env } from "~/env";

interface CanonicalBusiness {
  subdomain: string;
  customDomain?: string | null;
  domainStatus?: string | null;
}

/**
 * Returns the canonical base URL for a business storefront.
 *
 * Prefers the custom domain when active; falls back to the platform subdomain.
 * This mirrors the precedence used in `src/app/layout.tsx`'s `openGraph.url`.
 */
export function getCanonicalBaseUrl(business: CanonicalBusiness): string {
  if (business.customDomain && business.domainStatus === "ACTIVE") {
    return `https://${business.customDomain}`;
  }
  return `https://${business.subdomain}.${env.NEXT_PUBLIC_PLATFORM_DOMAIN}`;
}

/**
 * Returns the full canonical URL for a specific path on a business storefront.
 *
 * @param business - Business with subdomain/customDomain/domainStatus fields
 * @param path     - Path starting with "/" (e.g. "/shop/my-product")
 */
export function getCanonicalUrl(
  business: CanonicalBusiness,
  path: string,
): string {
  const base = getCanonicalBaseUrl(business);
  // Ensure path starts with "/" and base has no trailing slash
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

/**
 * Pure decision helper: returns an absolute canonical URL to redirect to when
 * the visitor is reaching the store via the platform subdomain but the business
 * has an active custom domain — otherwise returns null.
 *
 * A redirect is warranted ONLY when:
 *   - the business has an ACTIVE custom domain, AND
 *   - the current request host is NOT already that custom domain.
 *
 * Comparison is case-insensitive and ignores port numbers so that dev
 * environments (e.g. localhost:3000) are handled gracefully.
 *
 * @param business     - Business with subdomain/customDomain/domainStatus fields
 * @param currentHost  - The Host header value from the current request
 *                       (e.g. "myshop.simplepress.co" or "myshop.co")
 * @param path         - Full path + query string starting with "/"
 *                       (e.g. "/shop/my-product?color=red")
 * @returns Absolute canonical URL string when redirect is needed, else null
 *
 * NOTE: Do NOT import next/navigation here. Call `redirect()` in the server
 * component / layout after checking the return value of this function.
 */
export function enforceCanonicalHost(
  business: CanonicalBusiness,
  currentHost: string,
  path: string,
): string | null {
  // Only redirect when there is an active custom domain
  if (!business.customDomain || business.domainStatus !== "ACTIVE") {
    return null;
  }

  // Strip port from both sides for a stable comparison
  const stripPort = (host: string) => host.split(":")[0]!.toLowerCase();
  const canonicalHost = stripPort(business.customDomain);
  const incomingHost = stripPort(currentHost);

  // Already on the canonical host — no redirect needed
  if (incomingHost === canonicalHost) {
    return null;
  }

  // Visitor is on the platform subdomain (or any other host) → redirect
  return getCanonicalUrl(business, path);
}
