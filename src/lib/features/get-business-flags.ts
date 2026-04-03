import { db } from "~/server/db";

import { checkBusiness } from "../check-business";
import {
  FEATURE_REGISTRY,
  getDefaultFlags,
  getDisabledDueToDependency,
} from "./registry";

export async function getBusinessFlags() {
  const business = await checkBusiness();
  if (!business) {
    throw new Error("Business not found");
  }
  const businessData = await db.business.findUnique({
    where: { id: business.id },
    select: { featureFlags: true },
  });

  const defaults = getDefaultFlags();
  const stored = (businessData?.featureFlags as Record<string, boolean>) ?? {};
  const merged = { ...defaults, ...stored };
  const disabledByDependency = getDisabledDueToDependency(merged);

  const isEnabled = (key: string): boolean => {
    if (disabledByDependency.has(key)) return false;
    return merged[key] ?? FEATURE_REGISTRY[key]?.enabledByDefault ?? false;
  };

  return { flags: merged, isEnabled, disabledByDependency };
}
