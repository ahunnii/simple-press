import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import { getCanonicalBaseUrl } from "~/lib/canonical";
import { businessHostFilter } from "~/lib/domain-utils";
import { resolveFlags } from "~/lib/features/resolve-flags";
import { buildSitemapEntries } from "~/lib/seo/sitemap-entries";
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
    },
  });

  if (!business) return [];

  const baseUrl = getCanonicalBaseUrl(business);
  const { isEnabled } = resolveFlags(business.featureFlags);
  const rows = await loadSitemapRows(db, business.id, isEnabled);

  return buildSitemapEntries({ baseUrl, isEnabled, rows });
}
