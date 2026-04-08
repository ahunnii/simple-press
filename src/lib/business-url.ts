import { env } from "~/env";

interface BusinessUrlParams {
  subdomain: string;
  customDomain?: string | null;
  domainStatus?: string | null;
}

/**
 * Returns the correct storefront base URL for a business.
 *
 * Priority:
 * 1. Development → http://{subdomain}.localhost:3000
 * 2. Custom domain with ACTIVE status → https://{customDomain}
 * 3. Fallback (no custom domain, or pending DNS) → https://{subdomain}.{PLATFORM_DOMAIN}
 */
export function getBusinessUrl({
  subdomain,
  customDomain,
  domainStatus,
}: BusinessUrlParams): string {
  if (process.env.NODE_ENV === "development") {
    return `http://${subdomain}.localhost:3000`;
  }
  if (customDomain && domainStatus === "ACTIVE") {
    return `https://${customDomain}`;
  }
  return `https://${subdomain}.${env.NEXT_PUBLIC_PLATFORM_DOMAIN}`;
}
