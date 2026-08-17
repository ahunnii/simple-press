/**
 * The tab set of the SEO editor (`/admin/content/seo`), split out of the
 * editor component so the *scorecard* can name a tab too.
 *
 * Why a shared module rather than a local union:
 *
 * `computeSeoScorecard` runs on the server and emits plain `href` strings, so
 * every "Fix" row can be a real, linkable URL — that matters for the seven
 * checks whose fix lives on this very page, because the same scorecard shape is
 * also read by consumers that are NOT on `/admin/content/seo` and must be able
 * to navigate here. The hrefs therefore stay honest URLs.
 *
 * On the page itself, though, following one of those hrefs would be a
 * navigation to the path the owner is already on — which the dirty-form
 * navigation guard intercepts with a "Discard unsaved changes?" dialog, and
 * which would land them back on the Score tab they just clicked out of. So the
 * editor treats the href as a *mapping key* instead: `seoEditorTabFromHref`
 * turns a same-page href back into the tab it points at, and the row renders a
 * plain `<button>` that switches tabs in place. Anything that is not a
 * same-page href keeps its `<Link>`.
 *
 * Client-safe by construction: no `server-only`, no React, no imports at all —
 * `scorecard.ts` (server-only) and the client editor both depend on it.
 */

/** Every tab in the editor, in render order. `score` is the landing tab. */
export const SEO_EDITOR_TABS = ["score", "store", "pages", "search"] as const;

export type SeoEditorTab = (typeof SEO_EDITOR_TABS)[number];

/**
 * The tabs that actually hold form fields. Excluding `score` here is
 * load-bearing: a validation error must never route the owner to a read-only
 * report tab that shows no inputs at all.
 */
export type SeoEditTab = Exclude<SeoEditorTab, "score">;

export const SEO_EDITOR_PATH = "/admin/content/seo";

/** Narrow an untrusted `?tab=` value to a real tab, or `null`. */
export function parseSeoEditorTab(
  value: string | undefined | null,
): SeoEditorTab | null {
  if (value === undefined || value === null) return null;
  return (SEO_EDITOR_TABS as readonly string[]).includes(value)
    ? (value as SeoEditorTab)
    : null;
}

/**
 * The canonical URL for a tab. `score` is the default landing tab, so it gets
 * the bare path rather than `?tab=score` — one address, not two.
 */
export function seoEditorHref(tab: SeoEditorTab): string {
  return tab === "score" ? SEO_EDITOR_PATH : `${SEO_EDITOR_PATH}?tab=${tab}`;
}

/**
 * Inverse of `seoEditorHref`, for the on-page "Fix" rows: given a scorecard
 * href, the editing tab it points at, or `null` if it is not a same-page link
 * to an editing tab (a cross-page href, the bare path, or `?tab=score` — none
 * of which a tab switch could satisfy).
 */
export function seoEditorTabFromHref(href: string): SeoEditTab | null {
  const [path, query] = href.split("?");
  if (path !== SEO_EDITOR_PATH) return null;
  if (query === undefined) return null;

  const tab = parseSeoEditorTab(new URLSearchParams(query).get("tab"));
  return tab === null || tab === "score" ? null : tab;
}
