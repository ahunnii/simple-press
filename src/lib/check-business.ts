"use server";

import { headers } from "next/headers";

import { db } from "~/server/db";

export const checkBusiness = async () => {
  const headersList = await headers();

  const hostname = headersList.get("host") ?? "";

  // Extract subdomain or custom domain
  const domain = hostname.split(":")[0]; // Remove port

  const business = await db.business.findFirst({
    where: {
      OR: [
        { customDomain: domain },
        { subdomain: domain?.split(".")[0] }, // Extract subdomain
      ],
      status: "active",
    },
    select: { id: true, customDomain: true },
  });
  return business;
};
