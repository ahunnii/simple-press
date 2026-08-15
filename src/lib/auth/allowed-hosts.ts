import "server-only";

import { env } from "~/env";
import { db } from "~/server/db";

/**
 * Static hosts that never need a DB lookup. Custom domains are appended to the
 * shared `allowedHosts` array by {@link syncAllowedHostsFromDb} so Better Auth
 * can resolve a dynamic base URL for newly activated domains without a redeploy.
 *
 * Better Auth's `baseURL.allowedHosts` is a plain `string[]` captured once at
 * config time — there is no async/per-request hook. Mutating this same array
 * instance (keeping the platform prefix, replacing the dynamic suffix) is the
 * supported way to keep it fresh: `trustedOrigins` already queries the DB on
 * auth requests, so we refresh from there.
 */
export const PLATFORM_ALLOWED_HOSTS: readonly string[] = [
  "*.localhost:3000",
  "localhost:3000",
  env.NEXT_PUBLIC_PLATFORM_DOMAIN,
  `*.${env.NEXT_PUBLIC_PLATFORM_DOMAIN}`,
];

/** Shared mutable allowlist — the Better Auth config holds this exact reference. */
export const allowedHosts: string[] = [...PLATFORM_ALLOWED_HOSTS];

let lastSyncAt = 0;
const SYNC_TTL_MS = 60_000;

/**
 * Refresh custom-domain entries from active businesses.
 * Safe to call frequently — no-ops within the TTL window.
 */
export async function syncAllowedHostsFromDb(
  force = false,
): Promise<string[]> {
  const now = Date.now();
  if (!force && now - lastSyncAt < SYNC_TTL_MS) return allowedHosts;

  const businesses = await db.business.findMany({
    where: {
      // Suspended stays included (closed does not): platform admins suspend a
      // store to fix it and must still reach auth on its custom domain. The
      // tenant itself remains 404 for everyone else — see the matching filter
      // in `trustedOrigins` (~/server/better-auth/config.tsx).
      status: { in: ["active", "suspended"] },
      domainStatus: "ACTIVE",
      customDomain: { not: null },
    },
    select: { customDomain: true },
  });

  const customs = [
    ...new Set(
      businesses
        .map((b) => b.customDomain?.trim().toLowerCase())
        .filter((d): d is string => Boolean(d)),
    ),
  ];

  allowedHosts.length = PLATFORM_ALLOWED_HOSTS.length;
  allowedHosts.push(...customs);
  lastSyncAt = now;
  return allowedHosts;
}
