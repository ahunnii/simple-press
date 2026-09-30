import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

/**
 * Product-page fields. They apply to EVERY product page — the visual editor
 * previews them on a representative published product (page "product").
 *
 * The `sledge.global.product-*` keys keep their legacy prefix: they used to
 * live on page "global" / group "global.product" and `customFields` is a
 * live wire format, so the keys (and their defaults) never change.
 *
 * Trust badges deliberately have no built-in rows (`defaultsWhenEmpty` is
 * unset): an empty list renders no store-wide badges. Row keys (`icon`,
 * `label`) match `parseTemplateTrustBadgesListRows`; `icon` was added as an
 * optional sub-field, so rows saved with only `label` keep working.
 *
 * The root `index.ts` spreads `sledgeProductData` / `sledgeProductFieldGroups`
 * and `sections.ts` spreads `sledgeProductSections`.
 */
export const sledgeProductData: TemplateField[] = [
  {
    key: "sledge.global.product-trust-badges",
    label: "Badges",
    description:
      "Short bold lines shown under the price on every product page, such as One size fits most. Leave empty to hide.",
    type: "list",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    itemLabel: "badge",
    summaryKey: "label",
    maxItems: 6,
    itemSchema: [
      {
        key: "icon",
        label: "Icon",
        type: "icon",
        optional: true,
        description: "Small icon shown before the text. Leave blank for none.",
      },
      {
        key: "label",
        label: "Text",
        type: "text",
        description: "A few words, shown in bold capitals.",
        placeholder: "e.g. Free shipping on orders over $100!",
      },
    ],
  },
  {
    key: "sledge.global.product-shipping-description",
    label: "Shipping note",
    description:
      "One short line shown under the price on every product page. Leave blank to hide.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "e.g. Ships in 3–5 business days",
  },
  {
    key: "sledge.global.product-shipping-details",
    label: "Shipping and returns details",
    description:
      "Longer text in the Shipping & returns row under the buy button on every product page. Leave blank to hide it. Links to your Shipping Policy and Returns & Refunds Policy pages appear in this row when those pages are published.",
    type: "textarea",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "A few sentences on shipping times and returns",
  },
  {
    key: "sledge.global.product-care-instructions",
    label: "Care instructions",
    description:
      "Text in the Care instructions row under the buy button on every product page. Leave blank to hide the row.",
    type: "textarea",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "e.g. Spot clean only.",
  },
  {
    key: "sledge.global.product-question-description",
    label: "Question prompt",
    description:
      "Text in the Ask a question row of the Additional Information tab on every product page, followed by a link to your contact page. Leave blank to hide the row.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "e.g. Have a question about sizing?",
  },
  {
    key: "sledge.product.related-heading",
    label: "Related products heading",
    description:
      "Heading above the related products at the bottom of every product page. Leave blank to hide the heading. The section only appears when a product has related products.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue: "Related Products",
    placeholder: "e.g. You might also like",
  },
  {
    key: "sledge.product.coming-soon-heading",
    label: "Coming soon heading",
    description:
      "Shown in place of the buy button on products marked as coming soon.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue: "Coming Soon",
    placeholder: "e.g. Almost here",
  },
  {
    key: "sledge.product.coming-soon-body",
    label: "Coming soon message",
    description:
      "Line below the coming soon heading on products marked as coming soon. Leave blank to hide.",
    type: "textarea",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue: "This item isn't available yet. Check back soon.",
    placeholder: "e.g. Back in stock next month.",
  },
];

export const sledgeProductFieldGroups: TemplateFieldGroup[] = [
  {
    id: "product.details",
    title: "Product page",
    description:
      "Badges, shipping notes, and the extra rows shown on every product page.",
    icon: "🛍️",
    columns: 1,
  },
];

export const sledgeProductSections: TemplateSection[] = [
  {
    id: "product.details",
    page: "product",
    title: "Product page",
    description:
      "Badges, shipping notes, and the extra rows shown on every product page.",
    groupIds: ["product.details"],
    order: 0,
    hideable: false,
    links: [SECTION_LINKS.products],
  },
];
