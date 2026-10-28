import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import { getCanonicalBaseUrl } from "~/lib/canonical";
import { businessHostFilter } from "~/lib/domain-utils";
import { resolveFlags } from "~/lib/features/resolve-flags";
import {
  getPlatformMaintenance,
  resolveStorefrontMaintenance,
} from "~/lib/maintenance";
import {
  buildSitemapEntries,
  EMPTY_SITEMAP_ROWS,
} from "~/lib/seo/sitemap-entries";
import { db } from "~/server/db";
import { loadSitemapRows } from "~/server/seo/sitemap-rows";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headersList = await headers();
  const host = headersList.get("host") ?? "";

  const business = await db.business.findFirst({
    where: {
      ...businessHostFilter(host),
      status: "active",
    },
    select: {
      id: true,
      subdomain: true,
      customDomain: true,
      domainStatus: true,
      featureFlags: true,
      // Inputs to `resolveStorefrontMaintenance`, the resolver the storefront
      // layout uses to decide whether to serve the maintenance takeover.
      maintenanceMode: true,
      maintenanceVariant: true,
      maintenanceMessage: true,
      maintenanceCta: true,
      maintenanceOverline: true,
      maintenanceHeadline: true,
      maintenanceImage: true,
      maintenanceLaunchAt: true,
      maintenanceLaunchEndAt: true,
      maintenanceLocation: true,
      phoneNumber: true,
      supportEmail: true,
      timeZone: true,
    },
  });

  if (!business) return [];

  const baseUrl = getCanonicalBaseUrl(business);
  const { isEnabled } = resolveFlags(business.featureFlags);

  // A store in maintenance serves noindex everywhere; list only the homepage
  // (and skip the row queries) rather than advertise URLs Google can't index.
  const maintenanceActive = resolveStorefrontMaintenance({
    platform: await getPlatformMaintenance(),
    business,
  }).active;
  const rows = maintenanceActive
    ? EMPTY_SITEMAP_ROWS
    : await loadSitemapRows(db, business.id, isEnabled);

  return buildSitemapEntries({ baseUrl, isEnabled, rows, maintenanceActive });
}
