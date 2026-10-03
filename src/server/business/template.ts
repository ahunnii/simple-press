import { TRPCError } from "@trpc/server";

import type { DbClient } from "~/server/db";
import { TEMPLATES } from "~/lib/constants";
import { isTemplateAvailableForSubdomain } from "~/lib/template-ownership";

/**
 * Switch a business's storefront template. Shared by the shop-side
 * `business.updateTemplate` (businessId from the Host) and the platform hub's
 * `platformBusiness.setTemplate` (businessId from input).
 */
export async function setBusinessTemplate(
  db: DbClient,
  businessId: string,
  templateId: string,
) {
  const business = await db.business.findUnique({
    where: { id: businessId },
    select: { subdomain: true, templateId: true },
  });
  if (!business) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Business not found",
    });
  }

  // Commercial templates are locked to their owning subdomain. Allow only
  // templates available to this business (free templates + ones it owns),
  // plus its currently-active template so an existing assignment is never
  // lost. Never trust the client — re-validate ownership server-side.
  const allowed =
    templateId === business.templateId ||
    isTemplateAvailableForSubdomain(templateId, business.subdomain);
  if (!allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This template is not available for your store.",
    });
  }

  await db.business.update({
    where: { id: businessId },
    data: { templateId },
  });
  return { success: true as const };
}

/**
 * Templates a business may switch to: everything available to its subdomain,
 * plus its current template (so an existing assignment always shows).
 */
export async function getTemplateOptionsForBusiness(
  db: DbClient,
  businessId: string,
) {
  const business = await db.business.findUnique({
    where: { id: businessId },
    select: { subdomain: true, templateId: true },
  });
  if (!business) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Business not found",
    });
  }

  const options = TEMPLATES.filter(
    (t) =>
      t.id === business.templateId ||
      isTemplateAvailableForSubdomain(t.id, business.subdomain),
  ).map((t) => ({ id: t.id as string, name: t.name as string }));

  return { options, currentTemplateId: business.templateId };
}
