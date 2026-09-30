import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Product-page fields. They apply to EVERY product page — the visual editor
 * previews them on a representative published product (page "product").
 *
 * Shipping/returns notes replace the hardcoded "Free shipping over $80" /
 * "Easy returns" lines that used to sit in the trust line under the buy
 * button — those were false claims for most stores. Each note only renders
 * when non-blank, and links to the store's published shipping/refund policy
 * page only when one exists (`productPolicies` on
 * `DefaultProductPageTemplateProps`, resolved server-side in
 * `shop/[slug]/page.tsx`). See bamboo's `products/index.tsx` for the same
 * pattern.
 */
export const elegantProductData: TemplateField[] = [
  {
    key: "elegant.product.shipping-summary",
    label: "Shipping note",
    description:
      "Short shipping note shown near the buy button on every product page. Leave blank to hide. When your Shipping Policy page is published, a link to it appears here too.",
    type: "textarea",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "e.g. Ships within 2 business days.",
  },
  {
    key: "elegant.product.returns-summary",
    label: "Returns note",
    description:
      "Short returns note shown near the buy button on every product page. Leave blank to hide. When your Returns & Refunds Policy page is published, a link to it appears here too.",
    type: "textarea",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "e.g. Unopened items can be returned within 30 days.",
  },
  {
    key: "elegant.product.related-label",
    label: "Related products small label",
    description:
      "Small label shown above the related products heading at the bottom of the product page. The section only appears when a product has related products.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "Pairs well with",
    placeholder: "Pairs well with",
  },
  {
    key: "elegant.product.related-heading",
    label: "Related products heading",
    description:
      "Heading above the related products at the bottom of the page — the last word is always shown in italics.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "You may also like",
    placeholder: "You may also like",
  },
  {
    key: "elegant.product.related-button",
    label: "Related products button text",
    description: "Button below the related products grid, linking to the shop.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "View all products",
    placeholder: "View all products",
  },
  {
    key: "elegant.product.reviews-label",
    label: "Reviews small label",
    description:
      "Small label above the reviews heading. Only shown when reviews are enabled for your store.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "Reviews",
    placeholder: "Reviews",
  },
  {
    key: "elegant.product.reviews-heading",
    label: "Reviews heading",
    description:
      "Heading above the reviews list. Only shown when reviews are enabled for your store.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "What customers are saying",
    placeholder: "What customers are saying",
  },
  {
    key: "elegant.product.coming-soon-heading",
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
    key: "elegant.product.coming-soon-body",
    label: "Coming soon message",
    description: "Line below the coming soon heading. Leave blank to hide.",
    type: "textarea",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue: "This product isn't available yet. Check back soon.",
    placeholder: "e.g. Back in stock next month.",
  },
];

export const elegantProductFieldGroups: TemplateFieldGroup[] = [
  {
    id: "product.details",
    title: "Product page",
    description: "Text shown on every product page, around the buy button.",
    icon: "🛍️",
    columns: 1,
  },
];
