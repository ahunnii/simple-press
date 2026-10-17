import type { Metadata } from "next";
import { notFound } from "next/navigation";

import type { SiteSearchType } from "~/server/search/site-search-types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { buildPageMetadata, loadSeoBusiness } from "~/lib/seo";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { db } from "~/server/db";
import { searchSite } from "~/server/search/site-search";
import {
  SITE_SEARCH_MAX_LENGTH,
  SITE_SEARCH_TYPES,
} from "~/server/search/site-search-types";
import { api } from "~/trpc/server";

import { resolveSearchPopular } from "../_components/search/popular";
import { getTemplate } from "../_templates/registry";

/**
 * Site search results (flag `siteSearch`, off by default → 404).
 *
 * One `searchSite` call without a type filter, so every type tab keeps its
 * count; with `?type=` the page renders only that group, with a bigger cap.
 * (`searchSite` loads each group's candidates up to its own DB cap regardless
 * of `limitPerGroup`, so the larger cap only changes how many are returned.)
 *
 * Never indexed (`noindex, follow`): result pages are thin, duplicate
 * content. The homepage WebSite JSON-LD advertises the URL template instead.
 */

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function parseQuery(value: string | string[] | undefined): string {
  return firstParam(value).slice(0, SITE_SEARCH_MAX_LENGTH);
}

function parseType(
  value: string | string[] | undefined,
): SiteSearchType | null {
  const raw = firstParam(value);
  return (SITE_SEARCH_TYPES as readonly string[]).includes(raw)
    ? (raw as SiteSearchType)
    : null;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { isEnabled } = await getBusinessFlags();
  if (!isEnabled("siteSearch")) notFound();

  const business = await api.business
    .simplifiedGet()
    .catch(rethrowTrpcForErrorBoundary);
  if (!business) notFound();

  const params = await searchParams;
  const q = parseQuery(params.q);
  const type = parseType(params.type);

  const typeRow = await db.business.findUnique({
    where: { id: business.id },
    select: { businessType: true },
  });

  const result = await searchSite({
    businessId: business.id,
    q,
    isEnabled,
    businessType: typeRow?.businessType ?? null,
    limitPerGroup: type ? 48 : 24,
    timeZone: business.timeZone,
  });

  const popular = resolveSearchPopular(
    business.siteContent?.navigationItems,
    isEnabled,
  );

  const t = getTemplate(business.templateId);
  const SearchTemplate = t.SearchPage;
  if (!SearchTemplate) notFound();

  return (
    <SearchTemplate
      business={business}
      result={result}
      q={q}
      type={type}
      popular={popular}
    />
  );
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  // Flag off: don't leak a "Search results" title onto the 404.
  const { isEnabled } = await getBusinessFlags();
  if (!isEnabled("siteSearch")) notFound();

  const business = await loadSeoBusiness("/search");
  const q = parseQuery((await searchParams).q).trim();
  const metadata = buildPageMetadata({
    business,
    path: "/search",
    title: q ? `Search results for “${q}”` : "Search",
  });
  return { ...metadata, robots: { index: false, follow: true } };
}
