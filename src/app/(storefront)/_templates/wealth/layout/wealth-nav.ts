/**
 * Wealth's shipped main nav — what the header, mobile overlay and footer
 * quick-link fallback render until the owner saves their own menu (Admin →
 * Navigation). Pure module (no React) so the client header and the server
 * footer share it.
 *
 * Every entry still goes through `filterNavByFlags` at render time, so
 * `/services` (services flag), `/testimonials` (testimonials flag) and
 * `/blog` (blog flag) drop out on their own when switched off; a group left
 * with no children disappears. Group parents have an empty href: they are
 * dropdown/accordion labels, never links.
 *
 * Donate is NOT here — the header renders it as its own ledge button
 * (`donateLinkOptions(..., "header")`), the footer via
 * `resolveFooterQuickLinks({ donate })`.
 */

import type { NavItem } from "~/app/(storefront)/_components/nav";

import { WEALTH_FIELD_DEFAULTS } from "../lib/resolve-fields";

export const WEALTH_CEND_URL = "https://www.cendetroit.com";

/** The Impact group. "Impact Report" (/impact) only exists once the owner has
 *  published a CMS page with slug "impact"; without it the group would 404, so
 *  it is dropped and the lone "Meet the Co-ops" collapses to a top-level link. */
function impactNavItem(hasImpactPage: boolean): NavItem {
  const coops: NavItem = { label: "Meet the Co-ops", href: "/testimonials" };
  if (!hasImpactPage) return coops;
  return {
    label: "Impact",
    href: "",
    children: [{ label: "Impact Report", href: "/impact" }, coops],
  };
}

/** The defaults with the Resources link pointed at the owner's
 *  `wealth.global.nav-resources-url` field. `hasImpactPage` (server-computed,
 *  see `lib/has-impact-page.ts`) defaults to true = the full designed menu. */
export function wealthNavDefaults(
  resourcesUrl: string,
  hasImpactPage = true,
): NavItem[] {
  return [
    { label: "About Us", href: "/about" },
    {
      label: "Programs",
      href: "",
      children: [
        { label: "All Programs", href: "/services" },
        { label: "CEND", href: WEALTH_CEND_URL, external: true },
      ],
    },
    impactNavItem(hasImpactPage),
    {
      label: "News & Resources",
      href: "",
      children: [
        /^https?:\/\//i.test(resourcesUrl)
          ? { label: "Resources", href: resourcesUrl, external: true }
          : { label: "Resources", href: resourcesUrl },
        { label: "News", href: "/blog" },
      ],
    },
    { label: "Contact & Office Hours", href: "/contact" },
  ];
}

/** The defaults with the shipped Resources URL (footer fallback, tests). */
export const WEALTH_NAV_DEFAULTS: NavItem[] = wealthNavDefaults(
  WEALTH_FIELD_DEFAULTS["wealth.global.nav-resources-url"] ?? "/resources",
);
