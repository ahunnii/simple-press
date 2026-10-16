/**
 * The "Open in New Tab" rule for rich-text links, in one place.
 *
 * Stored `target` on a `link` mark:
 *  - `"_blank"` — the owner turned "Open in New Tab" on;
 *  - `"_self"`  — the owner turned it off (same tab);
 *  - `null` / `""` / missing — never chosen (content saved before the switch
 *    stored an explicit choice). An external link then keeps the historical
 *    default of a new tab; an internal link (`/…`, `#…`) stays in the tab.
 *
 * Pure and client-safe: used by the storefront / export link mark
 * (`createRendererLinkExtension`) and by the admin link dialog, so what the
 * switch shows is always what the storefront does.
 */
import { normalizeEditorHref } from "~/lib/normalize-editor-href";

/** True for a single-slash path (`/contact`) or an in-page anchor (`#faq`). Protocol-relative `//host` is external. */
export function isInternalHref(href: unknown): boolean {
  if (typeof href !== "string") return false;
  const value = href.trim();
  return (
    (value.startsWith("/") && !value.startsWith("//")) || value.startsWith("#")
  );
}

/**
 * The `target` the storefront renders for this link: `"_blank"` (new tab) or
 * `null` (no `target` attribute — same tab). Unknown values count as unset.
 */
export function resolveLinkTarget(
  href: unknown,
  storedTarget: unknown,
): "_blank" | null {
  if (storedTarget === "_blank") return "_blank";
  if (storedTarget === "_self") return null;
  return isInternalHref(href) ? null : "_blank";
}

/** What the dialog's "Open in New Tab" switch shows for an existing link. */
export function defaultOpenInNewTab(
  href: unknown,
  storedTarget: unknown,
): boolean {
  return resolveLinkTarget(href, storedTarget) === "_blank";
}

/**
 * The `target` to store when the dialog saves: always an explicit choice, so a
 * switched-off external link no longer falls back to a new tab.
 */
export function linkTargetAttr(openInNewTab: boolean): "_blank" | "_self" {
  return openInNewTab ? "_blank" : "_self";
}

/** `https://…`, `http://…` or protocol-relative `//…` — a web page elsewhere. */
const WEB_HREF_RE = /^(?:https?:)?\/\//i;

/**
 * For a NEW link, before the owner touches the switch: on for a web page on
 * another site, off for a page on this site, for `mailto:` / `tel:` / `sms:`
 * (they hand off to an app; a new tab would just be left blank), and while the
 * box is empty or not yet a valid link. `siteHosts` lets a pasted full address
 * of this store count as internal, exactly as Save will normalise it.
 */
export function autoOpenInNewTab(
  rawUrl: string,
  siteHosts: readonly string[] = [],
): boolean {
  const href = normalizeEditorHref(rawUrl, { siteHosts });
  return href !== null && WEB_HREF_RE.test(href);
}
