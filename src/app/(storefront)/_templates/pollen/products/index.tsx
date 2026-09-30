import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Product-page fields. They apply to EVERY product page — the visual editor
 * previews them on a representative published product (page "product").
 *
 * Trust badges deliberately have no built-in rows (`defaultsWhenEmpty` is
 * unset): an empty list renders no badges, and a product with its own
 * features (Products → product → features) always shows those instead. Row
 * keys (`icon`, `label`) match `parseTemplateTrustBadgesListRows`.
 */
export const pollenProductData: TemplateField[] = [
  {
    key: "pollen.product.shipping-summary",
    label: "Shipping note",
    description:
      "Short note in the Shipping row on every product page, e.g. delivery times. A link to your shipping policy is added automatically when that page is published. Leave blank to show just the link, or nothing if the policy isn't published.",
    type: "textarea",
    page: "product",
    group: "product.shipping",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "e.g. Ships within 2 business days.",
  },
  {
    key: "pollen.product.returns-summary",
    label: "Returns note",
    description:
      "Short note in the Returns row on every product page, e.g. refund terms. A link to your refund policy is added automatically when that page is published. Leave blank to show just the link, or nothing if the policy isn't published.",
    type: "textarea",
    page: "product",
    group: "product.returns",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "e.g. Unopened items can be returned within 30 days.",
  },
  {
    key: "pollen.product.question-text",
    label: "Questions link",
    description:
      "One line under the buy button that links to your contact page. Leave blank to hide.",
    type: "text",
    page: "product",
    group: "product.questions",
    gridColumn: "col-span-full",
    defaultValue: "Questions about this product? Contact us.",
    placeholder: "e.g. Need help choosing? Ask us.",
  },
  {
    key: "pollen.product.trust-badges",
    label: "Badges",
    description:
      "Up to four small badges shown under the buy button on products that don't have their own product features. Products with features set in Products show those instead.",
    type: "list",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    itemLabel: "badge",
    summaryKey: "label",
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
    key: "pollen.product.related-heading",
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
    key: "pollen.product.coming-soon-heading",
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
    key: "pollen.product.coming-soon-body",
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
  {
    key: "pollen.product.reviews-heading",
    label: "Reviews heading",
    description:
      "Heading above customer reviews near the bottom of every product page. Only shown when reviews are enabled for your store. Leave blank to hide the heading.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue: "What Customers Are Saying",
    placeholder: "What Customers Are Saying",
  },
];

export const pollenProductFieldGroups: TemplateFieldGroup[] = [
  {
    id: "product.details",
    title: "Product page",
    description: "Text shown on every product page, around the buy button.",
    icon: "🛍️",
    columns: 1,
  },
  {
    id: "product.shipping",
    title: "Shipping row",
    description:
      "Shipping note shown on every product page. Can be hidden independently of the returns and questions rows.",
    icon: "🚚",
    columns: 1,
  },
  {
    id: "product.returns",
    title: "Returns row",
    description:
      "Returns note shown on every product page. Can be hidden independently of the shipping and questions rows.",
    icon: "↩️",
    columns: 1,
  },
  {
    id: "product.questions",
    title: "Questions row",
    description:
      "Contact link shown under the buy button on every product page. Can be hidden independently of the shipping and returns rows.",
    icon: "❓",
    columns: 1,
  },
];
