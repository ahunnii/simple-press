import type {
  GenericTrustBadgeRow,
  TemplateField,
  TemplateFieldGroup,
} from "~/lib/template-fields";

/**
 * Field module for `page: "products"` — the shop listing hero
 * (`products.listing`, unchanged since before this redesign wave), the
 * compact "Why bamboo" strip near the bottom of the shop page
 * (`products.whyStrip`, NEW), and the sage reassurance band near the bottom
 * of every individual product page (`products.detail`, NEW).
 *
 * `products.detail` visually renders ONLY on `/shop/[slug]` (there is no
 * per-product field group elsewhere in this template), but `page: "products"`
 * previews to `/shop` in the editor (`PAGE_PREVIEW_PATHS`) — `/shop/[slug]`
 * itself has no editor preview at all. Clicking this section from the rail
 * while the editor shows `/shop` will therefore open the field panel without
 * highlighting a hotspot in the live preview (the documented, accepted
 * "unwired section" fallback from visual-editor-wiring.md — a full reload,
 * never a crash). Each field's description says so.
 */

const productsPageData: TemplateField[] = [
  {
    key: "bamboo.products.listing-title",
    label: "Products listing title",
    description: "Main heading on the products index page",
    type: "text",
    page: "products",
    group: "products.listing",
    gridColumn: "col-span-full",
    defaultValue: "Our Products",
    placeholder: "Our Products",
  },
  {
    key: "bamboo.products.listing-intro",
    label: "Products listing intro",
    description: "Short intro below the products listing title",
    type: "textarea",
    page: "products",
    group: "products.listing",
    gridColumn: "col-span-full",
    defaultValue: "Explore our collection of premium bamboo products.",
    placeholder: "Explore our collection of premium bamboo products.",
  },
  {
    key: "bamboo.products.why-strip-list",
    label: "Product Benefits",
    description:
      "Short benefit claims shown in the compact 'Why bamboo' strip near the bottom of the shop page, and reused as the trust row on every product page. Icon is not shown on this template (a bamboo leaf mark renders automatically) — only the label text appears.",
    type: "list",
    page: "products",
    group: "products.whyStrip",
    gridColumn: "col-span-full",
    minItems: 0,
    maxItems: 6,
    itemSchema: [
      { key: "icon", label: "Icon (not shown on this template)", type: "icon" },
      {
        key: "label",
        label: "Benefit",
        type: "text",
        placeholder: "100% Bamboo",
      },
    ],
  },
  {
    key: "bamboo.products.reassurance-heading",
    label: "Reassurance heading",
    description:
      "Heading for the shipping/reassurance band near the bottom of every product page. Previewed on the shop page in the editor (product pages have no editor preview).",
    type: "text",
    page: "products",
    group: "products.detail",
    gridColumn: "col-span-full",
    defaultValue: "From Detroit to your door",
    placeholder: "From Detroit to your door",
  },
  {
    key: "bamboo.products.reassurance-body",
    label: "Reassurance body",
    description:
      "Supporting line under the reassurance heading on every product page. Previewed on the shop page in the editor (product pages have no editor preview).",
    type: "textarea",
    page: "products",
    group: "products.detail",
    gridColumn: "col-span-full",
    defaultValue:
      "Nationwide shipping from Detroit. Every order is carefully packaged and always on time.",
    placeholder:
      "Nationwide shipping from Detroit. Every order is carefully packaged and always on time.",
  },
  {
    key: "bamboo.products.reassurance-button-text",
    label: "Reassurance button text",
    description:
      "Label for the button in the product page reassurance band. Previewed on the shop page in the editor (product pages have no editor preview).",
    type: "text",
    page: "products",
    group: "products.detail",
    gridColumn: "col-span-1",
    defaultValue: "Get in Touch",
    placeholder: "Get in Touch",
  },
  {
    key: "bamboo.products.reassurance-button-link",
    label: "Reassurance button link",
    description:
      "Where the reassurance band's button links to. Previewed on the shop page in the editor (product pages have no editor preview).",
    type: "url",
    page: "products",
    group: "products.detail",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
    placeholder: "/contact",
  },
];

export const bambooProductsData = [...productsPageData];

export const bambooProductsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "products.listing",
    title: "Products Listing Hero",
    description: "Products index page hero (title, intro, image)",
    icon: "📝",
    columns: 2,
  },
  {
    id: "products.whyStrip",
    title: "Why Bamboo Strip",
    description:
      "Compact benefits strip near the bottom of the shop page — reused as the trust row on every product page. Hideable on the shop page.",
    icon: "🌿",
    columns: 2,
  },
  {
    id: "products.detail",
    title: "Product Reassurance Band",
    description:
      "Sage shipping/reassurance band near the bottom of every product page. Previewed on the shop page in the editor (product pages have no editor preview).",
    icon: "🚚",
    columns: 2,
  },
];

/////

/** Real, verbatim benefits from the live product page — see
 * docs/templates/bamboo/mockups/content-pack-pages.md §2. Used whenever the
 * owner hasn't customized `bamboo.products.why-strip-list`. */
export const DEFAULT_WHY_STRIP_BENEFITS: GenericTrustBadgeRow[] = [
  { label: "100% Bamboo" },
  { label: "Chemical Free" },
  { label: "Septic Safe" },
  { label: "Extra Soft and Strong" },
];
