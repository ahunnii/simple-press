/**
 * Shared contract for storefront site search (flag `siteSearch`).
 * Server: `searchSite()` in ./site-search.ts. Client: the header dialog
 * (`_components/search`) and the `/search` page both render this shape.
 * Client-safe: types and constants only.
 */

export const SITE_SEARCH_TYPES = [
  "products",
  "services",
  "pages",
  "events",
  "faqs",
  "collections",
] as const;

export type SiteSearchType = (typeof SITE_SEARCH_TYPES)[number];

export const SITE_SEARCH_TYPE_LABELS: Record<SiteSearchType, string> = {
  products: "Products",
  services: "Services",
  pages: "Pages",
  events: "Events",
  faqs: "FAQs",
  collections: "Collections",
};

export const SITE_SEARCH_MIN_LENGTH = 2;
export const SITE_SEARCH_MAX_LENGTH = 80;

export type SiteSearchItem = {
  id: string;
  type: SiteSearchType;
  title: string;
  /** Short secondary line: variant/size hint, event date + place, "Blog post", etc. */
  subtitle?: string;
  /** ~140 chars of plain text around the first match (body matches only). */
  snippet?: string;
  /** Storefront path, e.g. /shop/linen-dress */
  href: string;
  /** Thumbnail URL when the item has one. */
  image?: string;
  /** Pre-formatted price ("$68", "from $180"). */
  priceLabel?: string;
};

export type SiteSearchGroup = {
  type: SiteSearchType;
  label: string;
  /** Total matches in this group (may exceed items.length). */
  count: number;
  items: SiteSearchItem[];
};

export type SiteSearchResult = {
  /** The normalized query that was run ("" when too short). */
  q: string;
  /** Sum of group counts. */
  total: number;
  /** Non-empty groups only, in display order for this business. */
  groups: SiteSearchGroup[];
};
