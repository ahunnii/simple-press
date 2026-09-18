import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

// design.md → "Per-page section concepts → Shop": three groups — the black
// page hero, the hideable compact door row (falls back to these four fields
// when the store has no published collections), and the grid's empty-state
// copy. The toolbar (type chips, product count, in-stock filter, sort) and
// pagination are structural, not fielded — see `umsc-shop-client.tsx`.

// ─── Shop: Hero ─────────────────────────────────────────────────────────────

const shopHeroData: TemplateField[] = [
  {
    key: "umsc.shop.hero-heading",
    label: "Shop Heading",
    description:
      "Headline in the black page-hero band at the top of the shop page.",
    type: "text",
    page: "shop",
    group: "shop.hero",
    gridColumn: "col-span-1",
    defaultValue: "Browse by product type.",
  },
  {
    key: "umsc.shop.hero-lede",
    label: "Shop Lede",
    description: "One sentence beneath the shop heading.",
    type: "textarea",
    page: "shop",
    group: "shop.hero",
    gridColumn: "col-span-1",
    defaultValue:
      "Small-batch soy candles, soaps, and body care, poured and packed by hand in Detroit.",
  },
];

// ─── Shop: Doors ────────────────────────────────────────────────────────────
// Compact door row (image 3:2). Real collections (`api.collections.getAllPublic`)
// win when the store has any published; these four rows are the fallback for a
// fresh store with none yet. Hideable — the door row can be turned off outright.

const shopDoorsData: TemplateField[] = [
  {
    key: "umsc.shop.doors",
    label: "Product Type Doors",
    description:
      "Shown only when your store has no published collections yet — otherwise your real collections are used automatically. Up to 4.",
    type: "list",
    page: "shop",
    group: "shop.doors",
    gridColumn: "col-span-full",
    maxItems: 4,
    itemSchema: [
      {
        key: "image",
        label: "Photo",
        type: "image",
        placeholder: "/placeholder.svg",
      },
      {
        key: "title",
        label: "Name",
        type: "text",
        placeholder: "e.g. Candles",
      },
      {
        key: "blurb",
        label: "Short Line",
        type: "text",
        placeholder: "e.g. Hand-poured soy",
      },
      {
        key: "link",
        label: "Link",
        type: "url",
        placeholder: "/collections/candles",
      },
    ],
    // No `defaultValue` on list fields (its type is `string`, not an array —
    // matches the convention in olive/homepage's list fields). The four
    // default doors below live as a plain constant, read by
    // `umsc-shop-page.tsx` when `parseTemplateListRows` returns empty.
  },
];

/** Default doors shown when the store has no published collections and the
 * owner hasn't customized `umsc.shop.doors` — door names are a design.md
 * verbatim keep (Candles / Soaps / Body Care / Home Care). */
export const UMSC_SHOP_DEFAULT_DOORS = [
  {
    _id: "door-candles",
    image: "",
    title: "Candles",
    blurb: "Hand-poured soy, small batch.",
    link: "/collections/candles",
  },
  {
    _id: "door-soaps",
    image: "",
    title: "Soaps",
    blurb: "Gentle bars for everyday washing.",
    link: "/collections/soaps",
  },
  {
    _id: "door-body-care",
    image: "",
    title: "Body Care",
    blurb: "Butters and oils for dry skin.",
    link: "/collections/body-care",
  },
  {
    _id: "door-home-care",
    image: "",
    title: "Home Care",
    blurb: "Sprays and melts for every room.",
    link: "/collections/home-care",
  },
];

// ─── Shop: Grid (empty state) ────────────────────────────────────────────────

const shopGridData: TemplateField[] = [
  {
    key: "umsc.shop.empty-heading",
    label: "Empty Shop Heading",
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
    label: "Empty Shop Text",
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
    label: "Empty Shop Link Text",
    description:
      "Link text shown beneath the empty-shop message, pointing to the contact page.",
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
    title: "Shop Page Hero",
    description:
      "Heading and lede in the black band at the top of the shop page",
    icon: "🛍️",
    columns: 2,
  },
  {
    id: "shop.doors",
    title: "Product Type Doors",
    description:
      "The compact door row shown when your store has no published collections yet",
    icon: "🚪",
    columns: 1,
  },
  {
    id: "shop.grid",
    title: "Shop Grid",
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
    description: "Black page-hero band with heading and lede",
    groupIds: ["shop.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "shop.doors",
    page: "shop",
    title: "Product Type Doors",
    description:
      "Compact door row — real collections, or the fallback rows below",
    groupIds: ["shop.doors"],
    order: 1,
    hideable: true,
  },
  {
    id: "shop.grid",
    page: "shop",
    title: "Toolbar & Grid",
    description: "Filter/sort toolbar, product grid and pagination",
    groupIds: ["shop.grid"],
    order: 2,
    hideable: false,
  },
];
