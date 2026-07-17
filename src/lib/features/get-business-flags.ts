import { db } from "~/server/db";

import { checkBusiness } from "../check-business";
import { resolveFlags } from "./resolve-flags";

export async function getBusinessFlags() {
  const business = await checkBusiness();
  if (!business) {
    throw new Error("Business not found");
  }
  const businessData = await db.business.findUnique({
    where: { id: business.id },
    select: { featureFlags: true },
  });

  const { flags, isEnabled, disabledByDependency } = resolveFlags(
    businessData?.featureFlags,
  );

  // Preserve the Set return type that existing callers depend on.
  return {
    flags,
    isEnabled,
    disabledByDependency: new Set(disabledByDependency),
  };
}
