import { cache } from "react";
import { headers } from "next/headers";

import { checkBusiness } from "~/lib/check-business";

import { auth } from ".";
import { db } from "../db";

export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);
export const getSessionWithBusinessMembership = cache(async () => {
  const session = await getSession();

  if (!session?.user) {
    return null;
  }

  // Get current business from domain
  const business = await checkBusiness();

  if (!business) {
    return { ...session, businessMembership: null };
  }

  // Platform admins have implicit access
  if (session.user.platformRole === "PLATFORM_ADMIN") {
    return {
      ...session,
      businessMembership: {
        businessId: business.id,
        role: "OWNER" as const, // Platform admins treated as owners
      },
    };
  }

  // Get user's membership for current business
  const membership = await db.businessMembership.findUnique({
    where: {
      userId_businessId: {
        userId: session.user.id,
        businessId: business.id,
      },
    },
    select: {
      businessId: true,
      role: true,
    },
  });

  return {
    ...session,
    businessMembership: membership,
  };
});
