import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Product-page fields. They apply to EVERY product page — the visual editor
 * previews them on a representative published product (page "product").
 *
 * Shipping / returns notes are short and blank by default (hidden until the
 * owner writes one); the full policy pages are linked beside them only when
 * they're published (`productPolicies` from `shop/[slug]/page.tsx`).
 * Everything else defaults to the copy the page shipped with.
 */
export const noiseProductData: TemplateField[] = [
  {
    key: "noise.product.shipping-note",
    label: "Shipping note",
    description:
      "Short shipping note shown under the buy button. Leave blank to hide. When your Shipping Policy page is published, a link to it appears here too.",
    type: "textarea",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "e.g. Ships within 3 business days.",
  },
  {
    key: "noise.product.returns-note",
    label: "Returns note",
    description:
      "Short returns note shown under the buy button. Leave blank to hide. When your Returns & Refunds Policy page is published, a link to it appears here too.",
    type: "textarea",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "e.g. Exchanges within 14 days of delivery.",
  },
  {
    key: "noise.product.question-text",
    label: "Questions link",
    description:
      "One line under the buy button that links to your contact page. Leave blank to hide.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "e.g. Questions about sizing? Ask us.",
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
      "Text shown on every product page — around the buy button and above related products.",
    icon: "🛍️",
    columns: 2,
  },
];
