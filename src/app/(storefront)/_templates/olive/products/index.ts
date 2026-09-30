import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Product-page fields. They apply to EVERY product page — the visual editor
 * previews them on a representative published product (page "product").
 *
 * Field KEYS keep the legacy `olive.global.product-` prefix: `customFields`
 * is keyed by field key, so renaming would orphan saved owner values. The
 * shipping/returns/questions fields originally lived in `product.details`
 * (was `global.product` before that); as of the 2026-09-28 parity fix
 * (PF13) each moved to its OWN group — `product.shipping` /
 * `product.returns` / `product.questions` — so the owner can hide one row
 * without hiding the others. Only `group` (and the description) changed;
 * keys, defaults and everything else are untouched, so saved values keep
 * resolving unchanged. See `docs/templates/olive/parity-plan-2026-09-28.md`
 * (decision under B6.2) — olive keeps its accordion look and its existing
 * keys; the platform baseline's own key names are waived for this template.
 */
export const oliveProductData: TemplateField[] = [
  {
    key: "olive.global.product-shipping-description",
    label: "Shipping text",
    description:
      "Shown in the 'Shipping' row on every product page. A link to your shipping policy is added automatically once that page is published. Leave this blank to show just the link — or hide the row entirely with its eye toggle if there's no policy either.",
    type: "textarea",
    page: "product",
    group: "product.shipping",
    gridColumn: "col-span-full",
    defaultValue:
      "Every order ships with a tracking link, sent the moment it leaves.",
  },
  {
    key: "olive.global.product-returns-description",
    label: "Returns text",
    description:
      "Shown in the 'Returns' row on every product page. A link to your returns policy is added automatically once that page is published. Leave this blank to show just the link — or hide the row entirely with its eye toggle if there's no policy either.",
    type: "textarea",
    page: "product",
    group: "product.returns",
    gridColumn: "col-span-full",
    defaultValue:
      "Unworn pieces with tags can come back — message us and we'll sort out an exchange or store credit.",
  },
  {
    key: "olive.global.product-question-text",
    label: "\"Questions?\" line",
    description:
      "Short line under the accordion inviting a question; it links to the contact page. Leave blank to hide the row.",
    type: "text",
    page: "product",
    group: "product.questions",
    gridColumn: "col-span-full",
    defaultValue: "Not sure about the fit or shade? Ask us.",
  },
  {
    key: "olive.global.product-reviews-heading",
    label: "Reviews heading",
    description:
      "Heading above customer reviews near the bottom of every product page. Only shown when reviews are turned on for your store. Leave blank to hide the heading.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "What people are saying",
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
      "Reviews heading, related products, coming-soon copy and trust badges shown on every product page",
    icon: "📦",
    columns: 1,
  },
  {
    id: "product.shipping",
    title: "Shipping row",
    description:
      "Shipping text shown on every product page. Can be hidden independently of the returns and questions rows.",
    icon: "🚚",
    columns: 1,
  },
  {
    id: "product.returns",
    title: "Returns row",
    description:
      "Returns text shown on every product page. Can be hidden independently of the shipping and questions rows.",
    icon: "↩️",
    columns: 1,
  },
  {
    id: "product.questions",
    title: "Questions row",
    description:
      "Contact link shown under the accordion on every product page. Can be hidden independently of the shipping and returns rows.",
    icon: "❓",
    columns: 1,
  },
];
