"use server";

import { headers } from "next/headers";

import { businessHostFilter } from "~/lib/domain-utils";
import { db } from "~/server/db";

export const checkBusiness = async () => {
  const headersList = await headers();

  const hostname = headersList.get("host") ?? "";

  const business = await db.business.findFirst({
    where: {
      ...businessHostFilter(hostname),
      status: "active",
    },
    select: {
      id: true,
      name: true,
      customDomain: true,
      umamiWebsiteId: true,
      umamiEnabled: true,
    },
  });
  return business;
};

export const checkBusinessMembership = async (
  businessId: string,
  userId: string,
) => {
  return db.businessMembership.findUnique({
    where: { userId_businessId: { userId, businessId } },
    select: { role: true },
  });
};

export const checkBusinessForEmail = async () => {
  const headersList = await headers();

  const hostname = headersList.get("host") ?? "";

  const business = await db.business.findFirst({
    where: {
      ...businessHostFilter(hostname),
      status: "active",
    },
    select: {
      id: true,
      name: true,
      customDomain: true,
      subdomain: true,
      domainStatus: true,
      siteContent: { select: { logoUrl: true } },
    },
  });
  return business;
};
