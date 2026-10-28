import { getCanonicalBaseUrl } from "~/lib/canonical";
import { fnv1a, resolveLogoSource } from "~/lib/site-icons/source";

/** The 1200×630 card `/og-fallback.png` renders, so declared dims are true. */
export const OG_FALLBACK_WIDTH = 1200;
export const OG_FALLBACK_HEIGHT = 630;

interface OgFallbackBusiness {
  subdomain: string;
  customDomain?: string | null;
  domainStatus?: string | null;
  siteContent?: { logoUrl?: string | null } | null;
}

/**
 * Absolute URL of the generated logo share card on the store's canonical
 * origin, or undefined when the store has no (storage-hosted) logo. `?v=`
 * changes with the logo so Facebook/LinkedIn re-scrape after a re-upload.
 */
export function ogFallbackImageUrl(
  business: OgFallbackBusiness | null | undefined,
): string | undefined {
  if (!business) return undefined;
  const logo = resolveLogoSource(business.siteContent);
  if (!logo) return undefined;
  return `${getCanonicalBaseUrl(business)}/og-fallback.png?v=${fnv1a(logo)}`;
}
