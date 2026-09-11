import { cache } from "react";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import {
  type MaintenanceCtaInput,
  type ResolvedMaintenanceCta,
  maintenanceCtaSchema,
  maintenanceMessageSchema,
  normalizeMaintenanceMessage,
  resolveMaintenanceCta,
} from "~/lib/maintenance-config";
import { db } from "~/server/db";

// Re-exported for convenience so callers of the server resolver don't also
// need to import from `~/lib/maintenance-config` directly.
export {
  maintenanceCtaSchema,
  maintenanceMessageSchema,
  normalizeMaintenanceMessage,
  resolveMaintenanceCta,
};
export type { MaintenanceCtaInput, ResolvedMaintenanceCta };

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

export function resolveStorefrontMaintenance(args: {
  platform: { active: boolean; message: string | null };
  business: {
    maintenanceMode: boolean;
    maintenanceVariant: string;
    maintenanceMessage: unknown;
    maintenanceCta: unknown;
    phoneNumber: string | null;
    supportEmail: string | null;
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
    };
  }
  return { active: false };
}
