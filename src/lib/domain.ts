// lib/domain.ts
//
// Server-side domain resolution. The pure/client-safe URL helpers live in
// `~/lib/domain-utils` and are re-exported here for backwards compatibility,
// so existing `~/lib/domain` imports keep working. Only import `~/lib/domain`
// from server code — `getBusinessByDomain` pulls in `~/server/db`.

import { extractSubdomain } from "./domain-utils";

// Re-export the pure helpers so existing `~/lib/domain` importers are unaffected.
export {
  getCurrentDomain,
  extractSubdomain,
  getMainDomain,
  buildDomainUrl,
  getCallbackUrl,
  encodeOAuthState,
  decodeOAuthState,
} from "./domain-utils";

/**
 * Get business by any domain type (server-only — queries the database)
 */
export async function getBusinessByDomain(domain: string) {
  const { db } = await import("~/server/db");

  // Extract subdomain if it's on main platform
  const subdomain = extractSubdomain(domain);

  if (subdomain) {
    // Search by subdomain
    return db.business.findUnique({
      where: { subdomain },
      include: {
        siteContent: {
          select: { logoUrl: true },
        },
      },
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
      include: {
        siteContent: {
          select: { logoUrl: true },
        },
      },
    });
  }
}
