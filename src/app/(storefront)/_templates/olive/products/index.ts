import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Product-page fields. They apply to EVERY product page — the visual editor
 * previews them on a representative published product (page "product").
 *
 * Field KEYS keep the legacy `olive.global.product-` prefix: `customFields`
 * is keyed by field key, so renaming would orphan saved owner values. Only
 * the page/group moved (was `global.product`, now `product.details`).
 */
export const oliveProductData: TemplateField[] = [
  {
    key: "olive.global.product-shipping-description",
    label: "Shipping text",
    description:
      "Shown in the 'Shipping' accordion on every product page. Leave blank to hide that accordion.",
    type: "textarea",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue:
      "Every order ships with a tracking link, sent the moment it leaves.",
  },
  {
    key: "olive.global.product-returns-description",
    label: "Returns text",
    description:
      "Shown in the 'Returns' accordion on every product page. Leave blank to hide that accordion.",
    type: "textarea",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue:
      "Unworn pieces with tags can come back — message us and we'll sort out an exchange or store credit.",
  },
  {
    key: "olive.global.product-question-text",
    label: "\"Questions?\" line",
    description:
      "Short line under the accordions inviting a question; it links to the contact page. Leave blank to hide.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue: "Not sure about the fit or shade? Ask us.",
  },
  {
    key: "olive.global.product-related-heading",
    label: "Related products heading",
    description:
      "Heading above the related-products rail on every product page.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "Complete the look",
  },
  {
    key: "olive.global.product-related-link-label",
    label: "Related products link",
    description:
      "Text link beside the related-products heading; points to the shop.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "See everything",
  },
  {
    key: "olive.global.product-coming-soon-heading",
    label: "Coming soon heading",
    description:
      "Shown instead of the buy controls when a product is marked coming soon.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "Coming soon",
  },
  {
    key: "olive.global.product-coming-soon-body",
    label: "Coming soon body",
    description: "One line under the coming-soon heading.",
    type: "textarea",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue:
      "This one isn't in the shop yet. Check back soon, or ask us when it lands.",
  },
  {
    key: "olive.global.product-related-empty",
    label: "Related products empty text",
    description:
      "Shown in place of the related-products rail when there is nothing to pair with the current product.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "Nothing to pair with this one yet",
  },
  {
    key: "olive.global.product-preorder-note",
    label: "Pre-order note",
    description:
      "Shown under the add-to-bag button when a product is in stock but only available on backorder.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "Pre-order — ships when available",
  },
  {
    key: "olive.global.product-max-in-bag",
    label: "Bag limit note",
    description:
      "Shown under the add-to-bag button once a shopper already has all the available stock of a product in their bag.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "Everything we have is already in your bag.",
  },
  {
    key: "olive.global.product-trust-badges",
    label: "Trust badges",
    description:
      "Short reassurance lines shown beneath the add-to-bag button on every product page (max 4).",
    type: "list",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    maxItems: 4,
    itemLabel: "badge",
    itemSchema: [
      {
        key: "label",
        label: "Badge text",
        type: "text",
        description: "One short reassurance line, e.g. 'Ships in 1–2 days'.",
        placeholder: "e.g. Ships in 1–2 days",
      },
    ],
  },
];

export const oliveProductFieldGroups: TemplateFieldGroup[] = [
  {
    id: "product.details",
    title: "Product page",
    description:
      "Shipping and returns text, the 'questions?' line and trust badges shown on every product page",
    icon: "📦",
    columns: 1,
  },
];
