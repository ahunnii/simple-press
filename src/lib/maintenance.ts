import { cache } from "react";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type {
  MaintenanceCtaInput,
  ResolvedMaintenanceCta,
  ResolvedMaintenanceLaunch,
} from "~/lib/maintenance-config";
import {
  maintenanceCtaSchema,
  maintenanceHeadlineSchema,
  maintenanceImageSchema,
  maintenanceLocationSchema,
  maintenanceMessageSchema,
  maintenanceOverlineSchema,
  maintenanceWallClockSchema,
  normalizeMaintenanceMessage,
  normalizeMaintenanceText,
  resolveMaintenanceCta,
  resolveMaintenanceLaunch,
} from "~/lib/maintenance-config";
import { db } from "~/server/db";

// Re-exported for convenience so callers of the server resolver don't also
// need to import from `~/lib/maintenance-config` directly.
export {
  maintenanceCtaSchema,
  maintenanceHeadlineSchema,
  maintenanceImageSchema,
  maintenanceLocationSchema,
  maintenanceMessageSchema,
  maintenanceOverlineSchema,
  maintenanceWallClockSchema,
  normalizeMaintenanceMessage,
  normalizeMaintenanceText,
  resolveMaintenanceCta,
  resolveMaintenanceLaunch,
};
export type {
  MaintenanceCtaInput,
  ResolvedMaintenanceCta,
  ResolvedMaintenanceLaunch,
};

export type StorefrontMaintenance =
  | { active: false }
  | {
      active: true;
      scope: "platform";
      variant: "maintenance";
      message: string | null;
    }
  | {
      active: true;
      scope: "business";
      variant: "maintenance" | "coming_soon";
      message: TiptapJSON | null;
      cta: ResolvedMaintenanceCta | null;
      /** `null` means "no owner value" — the template falls back to its own default copy. */
      overline: string | null;
      headline: string | null;
      /** A validated http(s) URL, or `null`. */
      image: string | null;
      location: string | null;
      /** Pre-formatted in `Business.timeZone`; see `~/lib/maintenance-config.ts`. */
      launch: ResolvedMaintenanceLaunch | null;
    };

export const getPlatformMaintenance = cache(async () => {
  const config = await db.platformConfig.findUnique({
    where: { id: "singleton" },
  });
  return {
    active: config?.maintenanceMode ?? false,
    message: config?.maintenanceMessage ?? null,
  };
});

/**
 * A stored image URL is re-validated on the way out rather than trusted: a row
 * written before the schema tightened (or by a store-transfer import) must never
 * put an arbitrary URL into a renderer's `src`.
 */
function parseMaintenanceImage(value: unknown): string | null {
  const parsed = maintenanceImageSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function resolveStorefrontMaintenance(args: {
  platform: { active: boolean; message: string | null };
  business: {
    maintenanceMode: boolean;
    maintenanceVariant: string;
    maintenanceMessage: unknown;
    maintenanceCta: unknown;
    maintenanceOverline: unknown;
    maintenanceHeadline: unknown;
    maintenanceImage: unknown;
    maintenanceLaunchAt: Date | string | null;
    maintenanceLaunchEndAt: Date | string | null;
    maintenanceLocation: unknown;
    phoneNumber: string | null;
    supportEmail: string | null;
    timeZone: string;
  };
}): StorefrontMaintenance {
  if (args.platform.active) {
    return {
      active: true,
      scope: "platform",
      variant: "maintenance",
      message: args.platform.message,
    };
  }
  if (args.business.maintenanceMode) {
    const variant =
      args.business.maintenanceVariant === "coming_soon"
        ? "coming_soon"
        : "maintenance";
    return {
      active: true,
      scope: "business",
      variant,
      message: normalizeMaintenanceMessage(args.business.maintenanceMessage),
      cta: resolveMaintenanceCta(args.business.maintenanceCta, {
        phoneNumber: args.business.phoneNumber,
        supportEmail: args.business.supportEmail,
      }),
      overline: normalizeMaintenanceText(args.business.maintenanceOverline),
      headline: normalizeMaintenanceText(args.business.maintenanceHeadline),
      image: parseMaintenanceImage(args.business.maintenanceImage),
      location: normalizeMaintenanceText(args.business.maintenanceLocation),
      launch: resolveMaintenanceLaunch(
        args.business.maintenanceLaunchAt,
        args.business.maintenanceLaunchEndAt,
        args.business.timeZone,
      ),
    };
  }
  return { active: false };
}
