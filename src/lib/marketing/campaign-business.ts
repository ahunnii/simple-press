import type { JSONContent } from "@tiptap/core";
import type { Prisma } from "generated/prisma";

import type { CampaignBusiness } from "./render-campaign";
import type { DbClient } from "~/server/db";
import { getBusinessUrl } from "~/lib/business-url";
import { EMAIL_FROM, formatFromAddress } from "~/lib/email/send";
import { resolveFlags } from "~/lib/features/resolve-flags";

/** Recipients per Resend batch (one `MarketingCampaignBatch` row each). */
export const BATCH_SIZE = 100;

/** Only an active store sends; `checkBusiness` resolves the same value. */
const ACTIVE_BUSINESS_STATUS = "active";

/** Whether the store is live (not suspended / closed): half of "sendable". */
export function isBusinessActive(business: { status: string }): boolean {
  return business.status === ACTIVE_BUSINESS_STATUS;
}

/**
 * Whether a store may send marketing email right now: active, with the
 * `emailMarketing` flag on. Checked by the worker before every batch and by
 * the scheduled-send sweep before queueing (`queue-campaign.ts`).
 */
export function isBusinessSendable(business: {
  status: string;
  featureFlags: unknown;
}): boolean {
  return (
    isBusinessActive(business) &&
    resolveFlags(business.featureFlags).isEnabled("emailMarketing")
  );
}

/**
 * Query-side twin of `isBusinessSendable` (a `business: { ... }` relation
 * filter). `emailMarketing` has no registry dependencies and defaults off,
 * so a stored `true` is exactly "enabled".
 */
export const SENDABLE_BUSINESS_WHERE = {
  status: ACTIVE_BUSINESS_STATUS,
  featureFlags: { path: ["emailMarketing"], equals: true },
} satisfies Prisma.BusinessWhereInput;

/**
 * The business fields a campaign render needs, loaded the same way by the
 * marketing router (send, test send, previews) and the scheduled-send sweep
 * (`queue-campaign.ts`), so a scheduled campaign renders exactly like one
 * sent by hand.
 */
export const CAMPAIGN_BUSINESS_SELECT = {
  name: true,
  ownerEmail: true,
  subdomain: true,
  customDomain: true,
  domainStatus: true,
  addressStreet: true,
  addressCity: true,
  addressState: true,
  addressPostalCode: true,
  businessAddress: true,
  templateId: true,
  siteContent: {
    select: { logoUrl: true, emailStyle: true, socialLinks: true },
  },
} satisfies Prisma.BusinessSelect;

export type LoadedCampaignBusiness = Prisma.BusinessGetPayload<{
  select: typeof CAMPAIGN_BUSINESS_SELECT;
}> &
  CampaignBusiness & {
    logoUrl: string | null;
    baseUrl: string;
    emailStyle: unknown;
    socialLinks: unknown;
  };

/** The business as a `CampaignBusiness`, or `null` when it doesn't exist. */
export async function loadCampaignBusiness(
  db: DbClient,
  businessId: string,
): Promise<LoadedCampaignBusiness | null> {
  const business = await db.business.findUnique({
    where: { id: businessId },
    select: CAMPAIGN_BUSINESS_SELECT,
  });
  if (!business) return null;
  return {
    ...business,
    logoUrl: business.siteContent?.logoUrl ?? null,
    baseUrl: getBusinessUrl(business),
    // Marketing email style (see ~/lib/marketing/email-style.ts).
    emailStyle: business.siteContent?.emailStyle ?? null,
    socialLinks: business.siteContent?.socialLinks ?? null,
  };
}

/** Same display-name format `sendEmail` uses (`~/lib/email/send.ts`). */
export function marketingFromAddress(businessName: string): string {
  return formatFromAddress(
    `${businessName} via SimplePress`,
    EMAIL_FROM.MARKETING,
  );
}

/** The stored campaign body as a tiptap doc, or `null` when it isn't one. */
export function storedBodyJson(value: unknown): JSONContent | null {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value as { type?: unknown }).type === "doc"
    ? (value as JSONContent)
    : null;
}
