/**
 * Built-in storefront routes an owner can link to (navigation Quick Add, the
 * rich-text link picker). One list so every surface offers the same routes in
 * the same order.
 *
 * Gating is derived from the path via `routeEnabled` (see
 * `~/lib/features/route-flags`) rather than repeated here, so a route that
 * 404s because its feature is off is never offered.
 *
 * Pure module — safe on either side of the server/client boundary.
 */
import { routeEnabled } from "~/lib/features/route-flags";

export type SiteLink = {
  /** Stable id (used for per-surface label overrides, e.g. the donate verb). */
  id: string;
  label: string;
  /** Same-site path, always starting with a single `/`. */
  path: string;
};

/** Always-listed order: matches the navigation builder's "Common Pages". */
export const COMMON_SITE_LINKS: readonly SiteLink[] = [
  { id: "collections", label: "Collections", path: "/collections" },
  { id: "shop", label: "Shop", path: "/shop" },
  { id: "blog", label: "Blog", path: "/blog" },
  { id: "events", label: "Events", path: "/events" },
  { id: "videos", label: "Videos", path: "/videos" },
  { id: "faq", label: "FAQ", path: "/faq" },
  { id: "contact", label: "Contact", path: "/contact" },
  { id: "about", label: "About", path: "/about" },
  { id: "donate", label: "Donate", path: "/donate" },
];

export const SERVICES_SITE_LINK: SiteLink = {
  id: "services",
  label: "Services",
  path: "/services",
};

/** Keeps the links whose gating feature flag(s) are on. */
export function filterSiteLinks(
  links: readonly SiteLink[],
  isEnabled: (flag: string) => boolean,
): SiteLink[] {
  return links.filter((link) => routeEnabled(link.path, isEnabled));
}

/** Common pages plus Services, filtered by feature flags (picker order). */
export function enabledSiteLinks(
  isEnabled: (flag: string) => boolean,
): SiteLink[] {
  return filterSiteLinks([...COMMON_SITE_LINKS, SERVICES_SITE_LINK], isEnabled);
}
