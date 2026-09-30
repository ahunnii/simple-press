import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Product-page fields. They apply to EVERY product page — the visual editor
 * previews them on a representative published product (page "product").
 *
 * No store-wide badge list: modern's "Why choose this" list is per-product
 * (Products → product → features) and stays that way.
 */
export const modernProductData: TemplateField[] = [
  {
    key: "modern.product.shipping-summary",
    label: "Shipping note",
    description:
      "Short shipping note shown under the add to cart button. Leave blank to hide. When your Shipping Policy page is published, a link to it appears here too.",
    type: "textarea",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "e.g. Ships within 2 business days.",
  },
  {
    key: "modern.product.returns-summary",
    label: "Returns note",
    description:
      "Short returns note shown under the add to cart button. Leave blank to hide. When your Returns & Refunds Policy page is published, a link to it appears here too.",
    type: "textarea",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "e.g. Unopened items can be returned within 30 days.",
  },
  {
    key: "modern.product.question-text",
    label: "Questions link",
    description:
      "One line under the add to cart button that links to your contact page. Leave blank to hide.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "e.g. Questions about this product? Ask us.",
  },
  {
    key: "modern.product.related-heading",
    label: "Related products heading",
    description:
      "Heading above the related products at the bottom of the page. The section only appears when a product has related products.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue: "You may also like",
    placeholder: "You may also like",
  },
  {
    key: "modern.product.coming-soon-heading",
    label: "Coming soon heading",
    description:
      "Shown in place of the add to cart button on products marked as coming soon.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue: "Coming Soon",
    placeholder: "Coming Soon",
  },
  {
    key: "modern.product.coming-soon-body",
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

export const modernProductFieldGroups: TemplateFieldGroup[] = [
  {
    id: "product.details",
    title: "Product page",
    description:
      "Text shown on every product page, around the add to cart button.",
    icon: "🛍️",
    columns: 1,
  },
];
