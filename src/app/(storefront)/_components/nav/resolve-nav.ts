/**
 * Template-agnostic nav resolution for storefront chrome (headers, mobile
 * panels, and footers). Pure module — no React, no hooks — so it is safe on
 * either side of the server/client boundary.
 *
 * Generalized from the happy-bamboo template's original resolver; happy-bamboo
 * and pollen both use it now. Callers pass their own shipped defaults instead
 * of this module owning one.
 */

import { isActiveNavLink } from "~/lib/nav-utils";

export type NavChild = { label: string; href: string; external?: boolean };
export type NavItem = NavChild & { children?: NavChild[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toChild(value: unknown): NavChild | null {
  if (!isRecord(value) || typeof value.label !== "string") return null;
  const child: NavChild = {
    label: value.label,
    href: typeof value.href === "string" ? value.href : "",
  };
  if (value.external === true) child.external = true;
  return child;
}

/**
 * Resolve the nav from `business.siteContent.navigationItems` (Admin → Content
 * → Navigation, validated by `navigationItemsSchema` in
 * src/lib/validators/content.ts — one level of children max).
 *
 * `??` semantics, never `||` or a `.length` check: an owner who saves an EMPTY
 * list means "no nav links" and must not be overwritten with `defaults`. Only
 * a missing / non-array value falls back. Entries are sanitized defensively
 * since the column is raw JSON: a string label is required, href defaults to
 * "", children are filtered the same way (and dropped when none survive). A
 * child with a blank href has nowhere to go, so it is dropped; a top-level
 * item left with neither an href nor children is dropped too (it would
 * render as a dead link).
 */
export function resolveNav(
  navigationItems: unknown,
  defaults: NavItem[],
): NavItem[] {
  if (!Array.isArray(navigationItems)) return defaults;

  const items: NavItem[] = [];
  for (const raw of navigationItems) {
    const base = toChild(raw);
    if (!base) continue;
    const item: NavItem = base;
    const rawChildren = (raw as Record<string, unknown>).children;
    if (Array.isArray(rawChildren)) {
      const children = rawChildren
        .map(toChild)
        .filter((c): c is NavChild => c !== null && c.href.trim() !== "");
      if (children.length) item.children = children;
    }
    if (!item.href.trim() && !item.children) continue;
    items.push(item);
  }
  return items;
}

/** A top-level item is "current" when its own href or any child's href is. */
export function isNavItemActive(pathname: string, item: NavItem): boolean {
  return (
    isActiveNavLink(pathname, item.href) ||
    !!item.children?.some((child) => isActiveNavLink(pathname, child.href))
  );
}

/**
 * The entries a disclosure (desktop dropdown / mobile accordion) lists for a
 * parent with children: the parent's own destination first — the trigger
 * itself never navigates, so a non-empty parent href must stay reachable —
 * then the children.
 */
export function navGroupEntries(item: NavItem): NavChild[] {
  const children = item.children ?? [];
  if (!item.href) return children;
  return [
    { label: item.label, href: item.href, external: item.external },
    ...children,
  ];
}

/**
 * Index of the single entry in a group that should carry `aria-current` —
 * the most specific (longest) matching href. `isActiveNavLink` is a prefix
 * match, so on `/services/massage` both a parent entry `/services` and the
 * child `/services/massage` match; only the child should be marked. -1 when
 * nothing matches.
 */
export function activeEntryIndex(
  pathname: string,
  entries: NavChild[],
): number {
  let best = -1;
  entries.forEach((entry, i) => {
    if (!isActiveNavLink(pathname, entry.href)) return;
    if (best === -1 || entry.href.length > entries[best]!.href.length) best = i;
  });
  return best;
}

/** Props that open `external` links in a new tab. */
export function externalLinkProps(external?: boolean) {
  return external
    ? ({ target: "_blank", rel: "noopener noreferrer" } as const)
    : {};
}
