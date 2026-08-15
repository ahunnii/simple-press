import "server-only";

import type { EmailOverride } from "./customization";
import { db } from "~/server/db";

import { emailOverridesSchema } from "./customization";

/**
 * Load the saved email overrides for a business by subdomain. Returns an
 * empty object when the business/site content is missing or the stored
 * JSON does not validate.
 *
 * Server-only — imports the Prisma client. Kept out of `customization.ts`
 * so that module stays safe to import from client components.
 */
export async function getEmailOverrides(
  subdomain: string,
): Promise<Record<string, EmailOverride>> {
  try {
    const business = await db.business.findFirst({
      where: { subdomain },
      select: {
        siteContent: {
          select: { emailOverrides: true },
        },
      },
    });

    const raw = business?.siteContent?.emailOverrides;
    if (!raw) return {};

    const parsed = emailOverridesSchema.safeParse(raw);
    return parsed.success ? parsed.data : {};
  } catch {
    // Never let override lookup failures block a transactional email.
    return {};
  }
}
