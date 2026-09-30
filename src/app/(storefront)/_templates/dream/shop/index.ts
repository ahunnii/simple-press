import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";
import { SECTION_LINKS } from "~/lib/section-links";

/**
 * Shop listing (`/shop`) fields for the `dream` template — the page hero
 * (same `DreamPageHero` band as `/services`) and the product grid's empty /
 * no-results copy. Filter, sort, and pagination labels are structural
 * microcopy inside `dream-shop-filter-client.tsx`.
 *
 * The orchestrator spreads `dreamShopData` / `dreamShopFieldGroups` into the
 * root `index.ts` and `dreamShopSections` into `sections.ts`. The page reads
 * these keys through `resolveDreamShopFields` below, never the root
 * `resolveFields`, so this module never imports the template root (no cycle,
 * and the defaults resolve even before the root aggregates them).
 */

// ─── shop.hero ──────────────────────────────────────────────────────────────
// Not hideable — the page's sole <h1> and its lead-in copy.

const shopHeroData: TemplateField[] = [
  {
    key: "dream.shop.hero-heading",
    label: "Heading",
    description:
      "The shop page's main heading, shown before the highlighted word.",
    type: "text",
    page: "shop",
    group: "shop.hero",
    gridColumn: "col-span-1",
    defaultValue: "Shop the",
    placeholder: "A few words",
  },
  {
    key: "dream.shop.hero-accent",
    label: "Highlighted word",
    description:
      "One script-styled word after the heading. Never more than one word. Leave blank to hide.",
    type: "text",
    page: "shop",
    group: "shop.hero",
    gridColumn: "col-span-1",
    defaultValue: "details",
    placeholder: "One word",
  },
  {
    key: "dream.shop.hero-lede",
    label: "Intro",
    description: "Short line under the shop heading. Leave blank to hide.",
    type: "textarea",
    page: "shop",
    group: "shop.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Decor pieces and party details you can order online, picked out for your celebration.",
    placeholder: "One or two short sentences",
  },
];

// ─── shop.grid ──────────────────────────────────────────────────────────────

const shopGridData: TemplateField[] = [
  {
    key: "dream.shop.empty-heading",
    label: "Empty shop heading",
    description:
      "Heading shown in place of the product grid while nothing is published.",
    type: "text",
    page: "shop",
    group: "shop.grid",
    gridColumn: "col-span-full",
    defaultValue: "New pieces are on their way",
    placeholder: "A short, warm line",
  },
  {
    key: "dream.shop.empty-body",
    label: "Empty shop message",
    description: "Line under the empty shop heading. Leave blank to hide.",
    type: "textarea",
    page: "shop",
    group: "shop.grid",
    gridColumn: "col-span-full",
    defaultValue:
      "Nothing is listed right now. Request an estimate and we'll help you plan the look.",
    placeholder: "One or two short sentences",
  },
  {
    key: "dream.shop.empty-cta-label",
    label: "Empty shop button label",
    description:
      "Label for the button under the empty shop message. Leave blank to hide the button.",
    type: "text",
    page: "shop",
    group: "shop.grid",
    gridColumn: "col-span-1",
    defaultValue: "Request an estimate",
    placeholder: "A short action",
  },
  {
    key: "dream.shop.empty-cta-url",
    label: "Empty shop button link",
    description:
      "Where the empty shop button goes. The button hides when this page is turned off.",
    type: "url",
    page: "shop",
    group: "shop.grid",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
    placeholder: "/contact",
  },
  {
    key: "dream.shop.no-results",
    label: "No matches message",
    description:
      "Shown when a search or filter matches no products, above a Clear filters link.",
    type: "text",
    page: "shop",
    group: "shop.grid",
    gridColumn: "col-span-full",
    defaultValue: "Nothing matches those filters yet.",
    placeholder: "A short line",
  },
];

export const dreamShopData: TemplateField[] = [
  ...shopHeroData,
  ...shopGridData,
];

export const dreamShopFieldGroups: TemplateFieldGroup[] = [
  {
    id: "shop.hero",
    title: "Page header",
    description: "Shop page heading, highlighted word, and intro.",
    icon: "☁️",
    columns: 2,
  },
  {
    id: "shop.grid",
    title: "Products",
    description:
      "Messages for the product grid: an empty shop, and a search with no matches.",
    icon: "🛍️",
    columns: 2,
  },
];

export const dreamShopSections: TemplateSection[] = [
  {
    id: "shop.hero",
    page: "shop",
    title: "Page header",
    description: "Heading, intro, and logo over the sky background.",
    groupIds: ["shop.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "shop.grid",
    page: "shop",
    title: "Products",
    description:
      "Search, filters, and the grid of published products, or the empty shop message.",
    groupIds: ["shop.grid"],
    links: [SECTION_LINKS.products],
    order: 1,
    hideable: false,
  },
];

const _fieldMap = new Map(dreamShopData.map((field) => [field.key, field]));

export function resolveDreamShopFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _fieldMap);
}
