/**
 * Storefront site search (flag `siteSearch`, off by default).
 *
 * Header wiring (P-SITE-SEARCH):
 *
 *   import { SiteSearchButton } from "~/app/(storefront)/_components/search";
 *
 *   <SiteSearchButton className="<header icon-button classes>"
 *                     iconClassName="h-5 w-5" strokeWidth={1.5} />
 *
 * It renders nothing while the flag is off, so it can sit in every header
 * unconditionally. Put it in the right-hand icon group before the account
 * icon, and in the mobile bar / menu if the template has one.
 *
 * A header with its own bespoke search icon (e.g. a `/shop?q=` link) keeps
 * its markup and calls the hook instead — byte-for-byte unchanged when off:
 *
 *   const siteSearch = useSiteSearch();
 *   <a href="/shop?q=" onClick={(e) => {
 *     if (!siteSearch.enabled) return;          // flag off → old behaviour
 *     e.preventDefault();
 *     siteSearch.open({ trigger: e.currentTarget });
 *   }} onPointerEnter={siteSearch.prefetch}>…</a>
 *
 * The layout root element must carry `data-sp-template-root` (the dialog
 * portals into it to keep the template's CSS variables and fonts).
 *
 * `SiteSearchProvider` is mounted once by `src/app/(storefront)/layout.tsx`
 * and `src/app/page.tsx`; templates never mount it. The dialog itself
 * (`site-search-dialog.tsx`) is code-split — do not import it directly.
 */

export {
  SiteSearchButton,
  type SiteSearchButtonProps,
} from "./site-search-button";

export {
  SiteSearchProvider,
  useSiteSearch,
  type SiteSearchContextValue,
  type SiteSearchOpenOptions,
} from "./site-search-context";

export { Highlight, highlightParts, highlightTerms } from "./highlight";

export { resolveSearchPopular, type SearchPopularLink } from "./popular";

export { SearchTypeIcon, SEARCH_TYPE_ICONS } from "./search-type-icon";
