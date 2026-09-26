import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Product-page fields. They apply to EVERY product page — the visual editor
 * previews them on a representative published product (page "product").
 *
 * `vii.global.product-shipping-description`, `vii.global.product-question-description`,
 * and `vii.global.product-trust-badges` moved here from the root `index.ts`
 * "Global: Product Page" group (2026-09-25 vii cleanup) — their keys are
 * UNCHANGED, only `page`/`group` moved, so previously saved values keep
 * resolving.
 *
 * Trust badges deliberately have no built-in fallback rows: an empty list
 * renders no store-wide badges at all, and a product's own features
 * (Products → product → features) always win over the store-wide list —
 * see `ViiProductPage`. Row keys (`icon`, `label`) match
 * `parseTemplateTrustBadgesListRows`.
 */
export const viiProductData: TemplateField[] = [
  {
    key: "vii.global.product-shipping-description",
    label: "Product Shipping & Returns Text",
    description:
      "Shown in the 'Shipping & returns' accordion on every product page. Leave blank to hide that accordion. When your shipping or returns policy pages are published, links to them appear here too.",
    type: "textarea",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue:
      "We ship within 1–2 business days. Returns are accepted within 30 days of delivery on unused items.",
  },
  {
    key: "vii.global.product-question-description",
    label: "Product 'Ask a Question' Text",
    description:
      "Shown below the buy button on every product page, above the link to your contact page. Leave blank to hide.",
    type: "textarea",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue:
      "Have a question about this product? Our team is happy to help.",
  },
  {
    key: "vii.product.question-link-text",
    label: "Questions link text",
    description:
      "Text for the link to your contact page, shown after the question text below the buy button.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "You can reach out to us here.",
    placeholder: "You can reach out to us here.",
  },
  {
    key: "vii.global.product-trust-badges",
    label: "Product Trust Badges",
    description:
      "Short reassurance lines shown beneath the add-to-cart button on every product page. A product with its own features set (Products → product → features) shows those instead.",
    type: "list",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    itemLabel: "badge",
    minItems: 0,
    maxItems: 4,
    itemSchema: [
      {
        key: "icon",
        label: "Icon",
        type: "icon",
        description: "Small icon shown before the badge text.",
      },
      {
        key: "label",
        label: "Text",
        type: "text",
        description: "A few words, e.g. Ships in 1-2 business days.",
        placeholder: "e.g. Ships in 1-2 business days",
      },
    ],
  },
  {
    key: "vii.product.related-overline",
    label: "Small label",
    description:
      "Small label above the related-products heading, at the bottom of the product page.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "Pair it with",
    placeholder: "Pair it with",
  },
  {
    key: "vii.product.related-heading",
    label: "Related products heading",
    description:
      "Heading above related products at the bottom of the product page. The section only appears when a product has related products.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "You may also",
    placeholder: "You may also",
  },
  {
    key: "vii.product.related-heading-accent",
    label: "Heading, highlighted words",
    description:
      "Shown in italics right after the related products heading.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "like",
    placeholder: "like",
  },
  {
    key: "vii.product.related-link-text",
    label: "Related products link text",
    description:
      "Text for the link to the shop page, shown next to the related products heading.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "All products",
    placeholder: "All products",
  },
  {
    key: "vii.product.coming-soon-heading",
    label: "Coming soon heading",
    description:
      "Shown in place of the buy button on products marked as coming soon.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "Coming Soon",
    placeholder: "Coming Soon",
  },
  {
    key: "vii.product.coming-soon-body",
    label: "Coming soon message",
    description:
      "Line below the coming soon heading on products marked as coming soon. Leave blank to hide.",
    type: "textarea",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue: "This product isn't available yet. Check back later!",
    placeholder: "e.g. Back in stock next month.",
  },
];

export const viiProductFieldGroups: TemplateFieldGroup[] = [
  {
    id: "product.details",
    title: "Product page",
    description: "Text shown on every product page, around the buy button.",
    icon: "🛍️",
    columns: 1,
  } satisfies TemplateFieldGroup,
];
