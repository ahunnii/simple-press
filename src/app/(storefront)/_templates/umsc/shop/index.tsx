import { listRowsFromDefaults } from "~/lib/lucide-template-icons";
import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

import { umscHeroPhotoFields } from "../shared/umsc-hero-fields";

// design.md → "Per-page section concepts → Shop": three groups — the dark
// page hero, the hideable compact door row (falls back to these four fields
// when the store has no published collections), and the grid's empty-state
// copy. The toolbar (type chips, product count, in-stock filter, sort) and
// pagination are structural, not fielded — see `umsc-shop-client.tsx`.

/** Default doors shown when the store has no published collections and the
 * owner hasn't customized `umsc.shop.doors` — door names are a design.md
 * verbatim keep (Candles / Soaps / Body Care / Home Care). */
const UMSC_SHOP_DOORS_DEFAULT_ROWS = [
  {
    image: "",
    title: "Candles",
    blurb: "Hand-poured soy, small batch.",
    link: "/collections/candles",
  },
  {
    image: "",
    title: "Soaps",
    blurb: "Gentle bars for everyday washing.",
    link: "/collections/soaps",
  },
  {
    image: "",
    title: "Body Care",
    blurb: "Butters and oils for dry skin.",
    link: "/collections/body-care",
  },
  {
    image: "",
    title: "Home Care",
    blurb: "Sprays and melts for every room.",
    link: "/collections/home-care",
  },
] satisfies Record<string, string>[];

// ─── Shop: Hero ─────────────────────────────────────────────────────────────

const shopHeroData: TemplateField[] = [
  {
    key: "umsc.shop.hero-heading",
    label: "Heading",
    description:
      "Headline in the dark page-hero band at the top of the shop page.",
    type: "text",
    page: "shop",
    group: "shop.hero",
    gridColumn: "col-span-1",
    defaultValue: "Browse by product type.",
  },
  {
    key: "umsc.shop.hero-lede",
    label: "Intro text",
    description: "One sentence beneath the heading.",
    type: "textarea",
    page: "shop",
    group: "shop.hero",
    gridColumn: "col-span-1",
    defaultValue:
      "Small-batch soy candles, soaps, and body care, poured and packed by hand in Detroit.",
  },
  ...umscHeroPhotoFields("shop", "shop.hero"),
];

// ─── Shop: Doors ────────────────────────────────────────────────────────────
// Compact door row (image 3:2). Real collections (`api.collections.getAllPublic`)
// win when the store has any published; these four rows are the fallback for a
// fresh store with none yet. Hideable — the door row can be turned off outright.

const shopDoorsData: TemplateField[] = [
  {
    key: "umsc.shop.doors",
    label: "Product type doors",
    description:
      "Shown only when your store has no published collections yet — otherwise your real collections are used automatically. Up to 4.",
    type: "list",
    page: "shop",
    group: "shop.doors",
    gridColumn: "col-span-full",
    maxItems: 4,
    itemLabel: "door",
    summaryKey: "title",
    defaultsWhenEmpty: true,
    defaultRows: UMSC_SHOP_DOORS_DEFAULT_ROWS,
    itemSchema: [
      {
        key: "image",
        label: "Photo",
        type: "image",
        description: "Photo shown on the door.",
        placeholder: "/placeholder.svg",
      },
      {
        key: "title",
        label: "Name",
        type: "text",
        description: "Door name, e.g. Candles.",
        placeholder: "e.g. Candles",
      },
      {
        key: "blurb",
        label: "Description",
        type: "text",
        description: "One short line under the name.",
        placeholder: "e.g. Hand-poured soy",
      },
      {
        key: "link",
        label: "Link",
        type: "url",
        description: "Where the door goes, e.g. /collections/candles.",
        placeholder: "/collections/candles",
      },
    ],
  },
];

// ─── Shop: Grid (empty state) ────────────────────────────────────────────────

const shopGridData: TemplateField[] = [
  {
    key: "umsc.shop.empty-heading",
    label: "Heading",
    description:
      "Shown on the grid when the store has no published products at all.",
    type: "text",
    page: "shop",
    group: "shop.grid",
    gridColumn: "col-span-1",
    defaultValue: "Nothing here yet.",
  },
  {
    key: "umsc.shop.empty-body",
    label: "Body text",
    description: "One line under the empty-shop heading.",
    type: "textarea",
    page: "shop",
    group: "shop.grid",
    gridColumn: "col-span-1",
    defaultValue:
      "New batches are on their way. Reach out and we'll let you know when they land.",
  },
  {
    key: "umsc.shop.empty-link-label",
    label: "Link text",
    description:
      "Text for the link beneath the empty-shop message, pointing to the contact page.",
    type: "text",
    page: "shop",
    group: "shop.grid",
    gridColumn: "col-span-1",
    defaultValue: "Get in touch",
  },
];

// ─── Exports ────────────────────────────────────────────────────────────────

export const umscShopData: TemplateField[] = [
  ...shopHeroData,
  ...shopDoorsData,
  ...shopGridData,
];

export const umscShopFieldGroups: TemplateFieldGroup[] = [
  {
    id: "shop.hero",
    title: "Hero",
    description:
      "Heading, intro text, and an optional photo in the dark band at the top of the shop page",
    icon: "🛍️",
    columns: 2,
  },
  {
    id: "shop.doors",
    title: "Product type doors",
    description:
      "The compact door row shown when your store has no published collections yet",
    icon: "🚪",
    columns: 1,
  },
  {
    id: "shop.grid",
    title: "Shop grid",
    description: "Copy shown when the product grid comes back empty",
    icon: "🧺",
    columns: 1,
  },
];

export const umscShopSections: TemplateSection[] = [
  {
    id: "shop.hero",
    page: "shop",
    title: "Hero",
    description:
      "Dark page-hero band with heading, intro text, and an optional photo",
    groupIds: ["shop.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "shop.doors",
    page: "shop",
    title: "Product type doors",
    description:
      "Compact door row — real collections, or the fallback rows below",
    groupIds: ["shop.doors"],
    order: 1,
    hideable: true,
    links: [SECTION_LINKS.collections],
  },
  {
    id: "shop.grid",
    page: "shop",
    title: "Shop grid",
    description:
      "Filter/sort toolbar, product grid, and pagination — including the empty-state copy",
    groupIds: ["shop.grid"],
    order: 2,
    hideable: false,
  },
];

// ─── Derived storefront constants ──────────────────────────────────────────

export const UMSC_SHOP_DEFAULT_DOORS = listRowsFromDefaults(
  UMSC_SHOP_DOORS_DEFAULT_ROWS,
  "default-door",
);
