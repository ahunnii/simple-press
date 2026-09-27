import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

/**
 * Product-page fields. They apply to EVERY product page — the visual editor
 * previews them on a representative published product (page "product").
 *
 * The first three keys keep the legacy `umsc.global.product-` prefix: they
 * used to live under `page: "global"` / `group: "global.product"` before the
 * template had a dedicated Product page in the editor, and `customFields` is
 * keyed by field key — renaming would orphan saved owner values. Only the
 * page/group moved (was `global.product`, now `product.details`). Every new
 * field added since uses the `umsc.product.*` key instead.
 */
export const umscProductData: TemplateField[] = [
  {
    key: "umsc.global.product-shipping-description",
    label: "Shipping & pickup text",
    description:
      "Shown in the 'Shipping & pickup' accordion on every product page. Leave blank to hide that accordion. When your Shipping Policy page is published, a link to it appears here too.",
    type: "textarea",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue:
      "We ship within 1–2 business days. Local pickup is available — we'll email you when it's ready.",
  },
  {
    key: "umsc.product.returns-note",
    label: "Returns text",
    description:
      "Shown in the 'Returns' accordion on every product page. Leave blank to hide that accordion. When your Returns & Refunds Policy page is published, a link to it appears here too.",
    type: "textarea",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue:
      "Returns are accepted within 30 days of delivery, unused and in original packaging.",
  },
  {
    key: "umsc.global.product-question-description",
    label: "Ask a question text",
    description:
      "Shown in the 'Ask a question' accordion on every product page. Leave blank to hide that accordion.",
    type: "textarea",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue:
      "Have a question about scent, size, or ingredients? Monique is happy to help.",
  },
  {
    key: "umsc.product.question-link-label",
    label: "Ask a question link text",
    description:
      "Text of the link at the end of the 'Ask a question' accordion, pointing to your contact page.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "Reach out here.",
  },
  {
    key: "umsc.product.coming-soon-heading",
    label: "Coming soon heading",
    description:
      "Shown in place of the buy button on products marked as coming soon.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "Coming Soon",
  },
  {
    key: "umsc.product.coming-soon-body",
    label: "Coming soon text",
    description:
      "Line below the coming-soon heading on products marked as coming soon.",
    type: "textarea",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue:
      "This product isn't available yet — check back soon.",
  },
  {
    key: "umsc.global.product-trust-badges",
    label: "Trust badges",
    description:
      "Short reassurance lines shown beneath the add-to-cart button on every product page (max 4).",
    type: "list",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    maxItems: 4,
    itemLabel: "badge",
    itemSchema: [
      {
        key: "icon",
        label: "Icon",
        type: "icon",
        description: "Small icon shown before the badge text.",
        optional: true,
      },
      {
        key: "label",
        label: "Badge text",
        type: "text",
        description: "One short reassurance line, e.g. 'Ships in 1-2 business days'.",
        placeholder: "e.g. Ships in 1-2 business days",
      },
    ],
  },
  {
    key: "umsc.product.reviews-heading",
    label: "Reviews heading",
    description: "Heading above the reviews section on every product page.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "Customer reviews",
  },
  {
    key: "umsc.product.related-heading",
    label: "Related products heading",
    description:
      "Heading above the related-products row at the bottom of every product page. The row only appears when the product has related products.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "You may also like",
  },
  {
    key: "umsc.product.related-link-label",
    label: "Related products link text",
    description:
      "Text of the link beside the related-products heading, pointing to the shop.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "All products",
  },
];

export const umscProductFieldGroups: TemplateFieldGroup[] = [
  {
    id: "product.details",
    title: "Product page",
    description:
      "Shipping/returns/question text, trust badges, the reviews heading, and related-products copy shown on every product page",
    icon: "📦",
    columns: 2,
  },
];

export const umscProductSections: TemplateSection[] = [
  {
    id: "product.details",
    page: "product",
    title: "Product page",
    groupIds: ["product.details"],
    links: [SECTION_LINKS.products],
    hideable: false,
    order: 0,
  },
];
