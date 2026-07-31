/**
 * Shared "is this nav link the current page" check for pink's chrome.
 *
 * An owner-configured nav item (via `Business.siteContent.navigationItems`)
 * can carry an empty or relative href. Without the leading-`/` guard,
 * `"".startsWith`-style matching marks EVERY page active, so two links can
 * render `aria-current="page"` simultaneously — an a11y violation and
 * visibly wrong (both paint in the active color). Used by both
 * `pink-header.tsx` (desktop nav) and `pink-mobile-menu.tsx` so they cannot
 * drift out of sync again (see review-2026-07-29.md B2).
 */
export function isActiveNavLink(pathname: string, href: string): boolean {
  if (!href?.startsWith("/")) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname?.startsWith(`${href}/`);
}
