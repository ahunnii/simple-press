import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Product-page fields. They apply to EVERY product page — the visual editor
 * previews them on a representative published product (page "product").
 *
 * Trust badges deliberately have no built-in rows (`defaultsWhenEmpty` is
 * unset): an empty list renders no badges, and a product with its own
 * features (Products → product → features) always shows those instead.
 * Row keys (`icon`, `label`) match `parseTemplateTrustBadgesListRows`.
 */
export const bambooProductFields: TemplateField[] = [
  {
    key: "bamboo.product.shipping-summary",
    label: "Shipping note",
    description:
      "Short shipping note shown in a Shipping row under the buy button. Leave blank to hide the row. When your Shipping Policy page is published, a link to it appears here too.",
    type: "textarea",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "e.g. Ships within 2 business days.",
  },
  {
    key: "bamboo.product.returns-summary",
    label: "Returns note",
    description:
      "Short returns note shown in a Returns row under the buy button. Leave blank to hide the row. When your Returns & Refunds Policy page is published, a link to it appears here too.",
    type: "textarea",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "e.g. Unopened items can be returned within 30 days.",
  },
  {
    key: "bamboo.product.question-text",
    label: "Questions link",
    description:
      "One line under the buy button that links to your contact page. Leave blank to hide.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "e.g. Questions about this product? Ask us.",
  },
  {
    key: "bamboo.product.trust-badges",
    label: "Badges",
    description:
      "Up to four small badges shown under the buy button on products that don't have their own product features. Products with features set in Products show those instead.",
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
        description: "A few words, e.g. Septic safe.",
        placeholder: "e.g. Septic safe",
      },
    ],
  },
  {
    key: "bamboo.product.related-heading",
    label: "Related products heading",
    description:
      "Heading above the related products at the bottom of the page. The section only appears when a product has related products.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue: "You Might Also Like",
    placeholder: "You Might Also Like",
  },
  {
    key: "bamboo.product.coming-soon-heading",
    label: "Coming soon heading",
    description:
      "Shown in place of the buy button on products marked as coming soon.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue: "Coming Soon",
    placeholder: "Coming Soon",
  },
  {
    key: "bamboo.product.coming-soon-body",
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

export const bambooProductFieldGroups: TemplateFieldGroup[] = [
  {
    id: "product.details",
    title: "Product page",
    description: "Text shown on every product page, around the buy button.",
    icon: "🛍️",
    columns: 1,
  },
];
