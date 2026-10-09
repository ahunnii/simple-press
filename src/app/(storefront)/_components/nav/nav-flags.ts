/**
 * Feature-flag filter for storefront nav (P-NAV-FLAGS in the template feature
 * baseline). Owner-saved nav (`SiteContent.navigationItems`) and a template's
 * shipped defaults can both point at routes whose feature is switched off —
 * those routes 404, so the link must not render. Apply after `resolveNav`, in
 * every header, mobile nav and footer.
 *
 * Pure module — no React, no hooks — safe on either side of the server/client
 * boundary. The caller supplies `isEnabled` (the resolved flag check, with
 * `dependsOn` cascades already applied).
 */

import {
  routeEnabled,
  routeFlag,
  routeOffFlag,
} from "~/lib/features/route-flags";

import type { NavChild, NavItem } from "./resolve-nav";

/**
 * The flag gating `href` most specifically, or null when no flag gates it
 * (see `routeFlag`). Matches whole path segments; external and non-path hrefs
 * are ungated.
 */
export const navHrefFlag = routeFlag;

/**
 * The first OFF flag gating `href`, or null (see `routeOffFlag`). Use this —
 * not `navHrefFlag` — for owner/field-driven hrefs: it sees the whole prefix
 * chain, so `/account/orders` is gated by `customerAccounts` as well as
 * `orders`. Callers keep their `flag === null || isEnabled(flag)` check.
 */
export const navHrefOffFlag = routeOffFlag;

/**
 * True when every flag gating `href` is on — `/account/orders` needs both
 * `customerAccounts` and `orders` (see `routeEnabled`).
 */
export const navHrefEnabled = routeEnabled;

function isGated(
  entry: NavChild,
  isEnabled: (key: string) => boolean,
): boolean {
  if (entry.external) return false;
  return !routeEnabled(entry.href, isEnabled);
}

/**
 * Drop nav entries that link to a flag-disabled feature. External links pass
 * through. Children are filtered; a parent is dropped when its own href is
 * gated, or when its href is empty and none of its children survived (it
 * would render as an empty dropdown). Returns new objects — never mutates
 * `items`.
 */
export function filterNavByFlags(
  items: NavItem[],
  isEnabled: (key: string) => boolean,
): NavItem[] {
  const out: NavItem[] = [];
  for (const item of items) {
    if (isGated(item, isEnabled)) continue;
    const { children, ...rest } = item;
    if (!children) {
      out.push(rest);
      continue;
    }
    const kept = children.filter((c) => !isGated(c, isEnabled));
    if (kept.length) out.push({ ...rest, children: kept });
    else if (item.href.trim()) out.push(rest);
  }
  return out;
}
