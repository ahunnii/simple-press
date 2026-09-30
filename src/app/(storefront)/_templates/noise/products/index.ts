import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Product-page fields. They apply to EVERY product page — the visual editor
 * previews them on a representative published product (page "product").
 *
 * Shipping and returns notes are short and blank by default; each row still
 * shows once its matching policy page (`productPolicies` from
 * `shop/[slug]/page.tsx`) is published, with just the policy link. Each row
 * — shipping, returns, questions — is its own hideable section
 * (`product.shipping` / `product.returns` / `product.questions`), so the
 * owner can turn any of them off from the editor. Everything else defaults
 * to the copy the page shipped with.
 */
export const noiseProductData: TemplateField[] = [
  {
    key: "noise.product.shipping-note",
    label: "Shipping note",
    description:
      "Short shipping note shown in its own row under the buy button. The row also shows (with just the policy link) when your Shipping Policy page is published, even with this left blank. Hide the row entirely with the eye toggle.",
    type: "textarea",
    page: "product",
    group: "product.shipping",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "e.g. Ships within 3 business days.",
  },
  {
    key: "noise.product.returns-note",
    label: "Returns note",
    description:
      "Short returns note shown in its own row under the buy button. The row also shows (with just the policy link) when your Returns & Refunds Policy page is published, even with this left blank. Hide the row entirely with the eye toggle.",
    type: "textarea",
    page: "product",
    group: "product.returns",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "e.g. Exchanges within 14 days of delivery.",
  },
  {
    key: "noise.product.question-text",
    label: "Questions link",
    description:
      "One line under the buy button that links to your contact page. Leave blank to hide the row.",
    type: "text",
    page: "product",
    group: "product.questions",
    gridColumn: "col-span-full",
    defaultValue: "Questions about this product? Contact us.",
    placeholder: "e.g. Questions about sizing? Ask us.",
  },
  {
    key: "noise.product.reviews-heading",
    label: "Reviews heading",
    description:
      "Heading above the reviews block on every product page, shown only when reviews are turned on. Leave blank to hide the heading (reviews still show).",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "What people are saying",
  },
  {
    key: "noise.product.coming-soon-heading",
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
    key: "noise.product.coming-soon-body",
    label: "Coming soon message",
    description:
      "Line below the coming soon heading on products marked as coming soon. Leave blank to hide.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "This piece isn't available yet. Check back soon.",
  },
  {
    key: "noise.product.sold-out-text",
    label: "Sold out button text",
    description:
      "Text on the disabled buy button when a product without options is out of stock.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "Sold Out",
  },
  {
    key: "noise.product.sold-out-message",
    label: "Sold out message",
    description:
      "Line above the back-in-stock email sign-up on sold-out products without options.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "Get notified when it's back in stock.",
  },
  {
    key: "noise.product.related-overline",
    label: "Related products small label",
    description:
      "Small label above the related products heading at the bottom of the page. The section only appears when a product has related products. Leave blank to hide.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "You may also like",
  },
  {
    key: "noise.product.related-heading",
    label: "Related products heading",
    description:
      "Heading above the related products at the bottom of the page. Leave blank to hide.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "More from the collection.",
  },
  {
    key: "noise.product.related-link-text",
    label: "Related products link text",
    description:
      "Text for the link to your shop beside the related products heading. Leave blank to hide.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "View all →",
  },
];

export const noiseProductFieldGroups: TemplateFieldGroup[] = [
  {
    id: "product.details",
    title: "Product page",
    description:
      "Text shown on every product page — stock states, the reviews heading and related products.",
    icon: "🛍️",
    columns: 2,
  },
  {
    id: "product.shipping",
    title: "Shipping row",
    description:
      "Shipping note and policy link, shown in its own row on every product page.",
    icon: "🚚",
    columns: 1,
  },
  {
    id: "product.returns",
    title: "Returns row",
    description:
      "Returns note and policy link, shown in its own row on every product page.",
    icon: "↩️",
    columns: 1,
  },
  {
    id: "product.questions",
    title: "Questions row",
    description: "Contact link, shown in its own row on every product page.",
    icon: "❓",
    columns: 1,
  },
];
