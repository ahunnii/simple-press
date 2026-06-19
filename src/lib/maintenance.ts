import { cache } from "react";

import { db } from "~/server/db";

export type StorefrontMaintenance =
  | { active: false }
  | {
      active: true;
      scope: "platform" | "business";
      variant: "maintenance" | "coming_soon";
      message: string | null;
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
    maintenanceMessage: string | null;
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
      message: args.business.maintenanceMessage,
    };
  }
  return { active: false };
}
