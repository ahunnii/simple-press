/**
 * Owner's footer "Quick Links" — a separate, flat list
 * (`SiteContent.footerNavigationItems`, validated by
 * `footerNavigationItemsSchema` in `~/lib/validators/content.ts`). Semantics
 * mirror `resolveNav`: `null`/missing falls back (here, to the main nav's
 * top level), a saved `[]` means "no links".
 *
 * Pure module — no React, no hooks — safe on either side of the
 * server/client boundary.
 */
import type { NavChild, NavItem } from "./resolve-nav";

import { withDonateLink } from "./donate-link";
import { filterNavByFlags } from "./nav-flags";
import { resolveNav } from "./resolve-nav";

/**
 * Flatten a resolved nav to the entries a footer can link to: children are
 * dropped (a footer list has no disclosures), and a group parent with no
 * href of its own — nothing to link to without its children — is dropped
 * too. `external` is preserved. Always returns fresh objects (no `children`
 * key), never the input items.
 */
export function topLevelNav(items: NavItem[]): NavChild[] {
  const out: NavChild[] = [];
  for (const item of items) {
    if (!item.href.trim()) continue;
    const child: NavChild = { label: item.label, href: item.href };
    if (item.external) child.external = true;
    out.push(child);
  }
  return out;
}

/**
 * Resolve the owner's footer list, falling back when it hasn't been set.
 *
 * `Array.isArray`, not `??`: a saved `[]` means "no footer links" and must
 * not be overwritten by `fallback` — same rule `resolveNav` applies to the
 * main nav. When it is an array, it's sanitized the same way a main-nav save
 * is (`resolveNav`, defaults irrelevant here since the value is already an
 * array) and then flattened with `topLevelNav` — the column has no
 * `children` field, but the row is raw JSON, so a legacy/malformed
 * `children` key is stripped rather than trusted.
 */
export function resolveFooterNav(
  footerItems: unknown,
  fallback: NavChild[],
): NavChild[] {
  if (!Array.isArray(footerItems)) return fallback;
  return topLevelNav(resolveNav(footerItems, []));
}

/**
 * The common case: an owner's footer quick links, falling back to the main
 * nav's top level when they haven't set their own, with feature-flag gating
 * applied last (same P-NAV-FLAGS rule every header/mobile nav/footer
 * applies — see `nav-flags.ts`). When `donate` is passed (build it with
 * `donateLinkOptions(business, isEnabled, "footer")`), the Donations "show in
 * footer" switch is applied last via `withDonateLink`: it only appends a
 * /donate link, never removes or duplicates one.
 */
export function resolveFooterQuickLinks(opts: {
  footerItems: unknown;
  navigationItems: unknown;
  navDefaults: NavItem[];
  isEnabled: (key: string) => boolean;
  donate?: { show: boolean; label: string };
}): NavChild[] {
  const { footerItems, navigationItems, navDefaults, isEnabled, donate } = opts;
  const mainNavFallback = topLevelNav(resolveNav(navigationItems, navDefaults));
  const links = filterNavByFlags(
    resolveFooterNav(footerItems, mainNavFallback),
    isEnabled,
  );
  return donate ? withDonateLink(links, donate) : links;
}

/**
 * Templates whose footer renders the owner's footer quick links
 * (`resolveFooterQuickLinks`). Admin reads this to warn an owner editing the
 * Footer Quick Links field on a template that won't render it. Add new
 * templates here per feature-baseline B10.4 as they adopt the feature — ids
 * must match `src/app/(storefront)/_templates/registry.ts`.
 */
export const FOOTER_QUICK_LINKS_TEMPLATES: readonly string[] = [
  "bamboo",
  "happy-bamboo",
  "pollen",
  "vii",
  "dark-trend",
  "dream",
  "elegant",
  "modern",
  "default",
  "noise",
  "umsc",
  "pink",
  "olive",
  "glove",
  "wealth",
];

/**
 * Templates whose footer falls back to their OWN built-in quick-links list
 * (not the main nav's top level) when the owner hasn't saved a footer list.
 * Value = a short owner-facing description of that built-in list, shown in
 * Admin > Navigation. Every key must also be in `FOOTER_QUICK_LINKS_TEMPLATES`.
 *
 * Must be kept in sync with the footers' fallback lists:
 * - default: `default/layout/default-footer.tsx` (`quickLinksFallback`)
 * - noise: `noise/layout/noise-footer.tsx` (`quickLinksFallback`)
 * - pink: `pink/layout/pink-footer.tsx` (Studio column `col2Defaults`, or the
 *   template's saved footer links)
 * - umsc: `umsc/layout/umsc-footer.tsx` (`UMSC_HELP_DEFAULTS`)
 */
export const FOOTER_QUICK_LINKS_BUILT_IN_FALLBACK: Readonly<
  Record<string, string>
> = {
  default:
    "About us, Reviews, Blog and Services (Reviews, Blog and Services only when those features are on), plus Donate when it is set to show in the footer",
  noise:
    "About Us, Blog, Testimonials and Contact (Blog and Testimonials only when those features are on)",
  pink: "About, Journal, Events, Videos, Testimonials and Contact (Journal, Events, Videos and Testimonials only when those features are on), unless you've set your own links in the template's footer settings",
  umsc: "FAQ, Contact and Custom orders",
};
