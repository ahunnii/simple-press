import { db } from "~/server/db";

import { resolveFlags } from "./resolve-flags";

/**
 * Resolve whether a single feature flag is enabled for a given business,
 * looked up directly by businessId (not the request-hostname-resolved
 * business — see `getBusinessFlags` for that).
 *
 * Mirrors the merge + dependency-cascade semantics in `resolveFlags`:
 * business.featureFlags overrides are merged over the registry defaults,
 * then any feature disabled-by-dependency is forced off.
 *
 * Used by server routes (e.g. store-transfer, wordpress-export) that need to
 * gate on a flag for a businessId resolved outside the normal per-request
 * tenant context (PLATFORM_ADMIN acting on behalf of another business).
 */
export async function isFeatureEnabledForBusiness(
  businessId: string,
  key: string,
): Promise<boolean> {
  const row = await db.business.findUnique({
    where: { id: businessId },
    select: { featureFlags: true },
  });

  const { isEnabled } = resolveFlags(row?.featureFlags);
  return isEnabled(key);
}
