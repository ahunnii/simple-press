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
