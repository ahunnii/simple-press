import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Product-page fields. They apply to EVERY product page — the visual editor
 * previews them on a representative published product (page "product").
 *
 * `vii.global.product-trust-badges` moved here from the root `index.ts`
 * "Global: Product Page" group (2026-09-25 vii cleanup) — its key is
 * UNCHANGED, only `page`/`group` moved, so previously saved values keep
 * resolving.
 *
 * `vii.product.shipping-summary` / `returns-summary` / `question-text`
 * (2026-09-28 parity fix, PF19) replace the single "Shipping & returns"
 * accordion item (one textarea covering both) with three independently
 * hideable accordion rows — Shipping, Returns, Questions — matching the
 * happy-bamboo/bamboo split. The retired `vii.global.product-shipping-description`,
 * `vii.global.product-question-description`, and `vii.product.question-link-text`
 * keys are no longer declared here; `ViiProductPage` reads them as a
 * read-only fallback via `getRawCustomFieldString` so skinbar-vii's saved
 * copy keeps showing until the owner re-saves the new fields. Ask the
 * orchestrator to add all three to `RETIRED_TEMPLATE_KEYS`
 * (`src/lib/template-fields.ts`) — never delete a saved key outright.
 *
 * Trust badges deliberately have no built-in fallback rows: an empty list
 * renders no store-wide badges at all, and a product's own features
 * (Products → product → features) always win over the store-wide list —
 * see `ViiProductPage`. Row keys (`icon`, `label`) match
 * `parseTemplateTrustBadgesListRows`.
 */
export const viiProductData: TemplateField[] = [
  {
    key: "vii.product.shipping-summary",
    label: "Shipping note",
    description:
      "Short note in the Shipping row on every product page, e.g. delivery times. A link to your shipping policy is added automatically when that page is published. Leave blank to show just the link, or nothing if the policy isn't published.",
    type: "textarea",
    page: "product",
    group: "product.shipping",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "e.g. Ships within 1-2 business days.",
  },
  {
    key: "vii.product.returns-summary",
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
    key: "vii.product.question-text",
    label: "Questions link",
    description:
      "One line under the buy button that links to your contact page. Leave blank to hide.",
    type: "text",
    page: "product",
    group: "product.questions",
    gridColumn: "col-span-full",
    defaultValue: "Have a question about this product? Get in touch.",
    placeholder: "e.g. Questions about this product? Ask us.",
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
  {
    key: "vii.product.reviews-heading",
    label: "Reviews heading",
    description:
      "Heading above customer reviews near the bottom of every product page. Only shown when reviews are enabled for your store. Leave blank to hide the heading.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue: "What customers are saying",
    placeholder: "e.g. Customer reviews",
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
  {
    id: "product.shipping",
    title: "Shipping row",
    description:
      "Shipping note shown on every product page. Can be hidden independently of the returns and questions rows.",
    icon: "🚚",
    columns: 1,
  } satisfies TemplateFieldGroup,
  {
    id: "product.returns",
    title: "Returns row",
    description:
      "Returns note shown on every product page. Can be hidden independently of the shipping and questions rows.",
    icon: "↩️",
    columns: 1,
  } satisfies TemplateFieldGroup,
  {
    id: "product.questions",
    title: "Questions row",
    description:
      "Contact link shown under the buy button on every product page. Can be hidden independently of the shipping and returns rows.",
    icon: "❓",
    columns: 1,
  } satisfies TemplateFieldGroup,
];
