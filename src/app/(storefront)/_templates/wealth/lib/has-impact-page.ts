import { cache } from "react";

import { api } from "~/trpc/server";

import { WEALTH_IMPACT_SLUG } from "../impact/constants";

/** The Impact Report only exists at `/impact` once the owner has published a
 *  CMS page with this slug (the generic-page branch renders it). */
export const WEALTH_IMPACT_HREF = `/${WEALTH_IMPACT_SLUG}`;

/** Pure check over the `getSimplifiedPages` rows (already published-only). */
export function pagesIncludeImpact(
  pages: readonly { slug: string }[] | null | undefined,
): boolean {
  return !!pages?.some((p) => p.slug === WEALTH_IMPACT_SLUG);
}

/** True when `href` points at the Impact Report route (`/impact`, trailing
 *  slash / query / hash tolerated). Absolute URLs never match. */
export function isImpactHref(href: string): boolean {
  const path = href.trim().split(/[?#]/)[0] ?? "";
  return path.replace(/\/+$/, "").toLowerCase() === WEALTH_IMPACT_HREF;
}

/**
 * Does this business have a published page at `/impact`? One id/title/slug
 * list read (no `content`), memoised per request with React `cache` so the
 * layout, header props, footer and homepage share a single fetch. A failed
 * read counts as "no page": the safe side is hiding a link, never a 404.
 */
export const hasImpactPage = cache(async (): Promise<boolean> => {
  try {
    return pagesIncludeImpact(
      await api.content.getSimplifiedPages({ type: "all" }),
    );
  } catch {
    return false;
  }
});
