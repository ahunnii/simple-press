import { TRPCError } from "@trpc/server";

import { db } from "~/server/db";

import { checkBusiness } from "../check-business";
import { resolveFlags } from "./resolve-flags";

export async function getBusinessFlags() {
  const business = await checkBusiness();
  if (!business) {
    // A TRPCError, not a bare Error: this runs inside the `featureGate`
    // middleware (`~/server/api/trpc`), and tRPC can only classify an unknown
    // Error as INTERNAL_SERVER_ERROR. That turned every request to a host with
    // no Business — the platform domain, a typo'd subdomain, a probe — into a
    // 500 that `src/app/api/trpc/[trpc]/route.ts` then reported to Sentry as a
    // server bug. An unresolvable host is an expected 404, and NOT_FOUND is
    // already what the routers throw for this same condition (see
    // `contact.ts`). TRPCError still extends Error, so the server components
    // that call this directly are unaffected.
    throw new TRPCError({ code: "NOT_FOUND", message: "Business not found" });
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
