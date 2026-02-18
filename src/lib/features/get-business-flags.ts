import { db } from "~/server/db";

import {
  FEATURE_REGISTRY,
  getDefaultFlags,
  getDisabledDueToDependency,
} from "./registry";

export async function getBusinessFlags(businessId: string) {
  const business = await db.business.findUnique({
    where: { id: businessId },
    select: { featureFlags: true },
  });

  const defaults = getDefaultFlags();
  const stored = (business?.featureFlags as Record<string, boolean>) ?? {};
  const merged = { ...defaults, ...stored };
  const disabledByDependency = getDisabledDueToDependency(merged);

  const isEnabled = (key: string): boolean => {
    if (disabledByDependency.has(key)) return false;
    return merged[key] ?? FEATURE_REGISTRY[key]?.enabledByDefault ?? false;
  };

  return { flags: merged, isEnabled, disabledByDependency };
}
