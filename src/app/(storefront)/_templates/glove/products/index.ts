import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

/**
 * Product-page fields. They apply to EVERY product page; the visual editor
 * previews them on a representative published product (page "product").
 */

// ─── Easy Guide banner ──────────────────────────────────────────────────────

const guideData: TemplateField[] = [
  {
    key: "glove.product.guide-text",
    label: "Banner text",
    description:
      "Text at the start of the banner shown above the options on made-to-order products, before the guide link. Leave blank to hide the banner.",
    type: "text",
    page: "product",
    group: "product.guide",
    gridColumn: "col-span-full",
    defaultValue: "Feeling confused about all your options? Check out our",
    placeholder: "e.g. Not sure where to start? See our",
  },
  {
    key: "glove.product.guide-link-label",
    label: "Guide link label",
    description: "The bold link at the end of the banner.",
    type: "text",
    page: "product",
    group: "product.guide",
    gridColumn: "col-span-1",
    defaultValue: "Easy Guide to Creating Your Perfect LuvGluv",
  },
  {
    key: "glove.product.guide-link",
    label: "Guide link",
    description: "Where the banner link goes.",
    type: "url",
    page: "product",
    group: "product.guide",
    gridColumn: "col-span-1",
    defaultValue: "/easy-guide",
  },
];

// ─── Product details (buy column, description, reviews, related) ───────────

const detailsData: TemplateField[] = [
  {
    key: "glove.product.notice-collection-slug",
    label: "Custom-made collection",
    description:
      "Slug of the collection whose products are made to order (gloves). Those products show the notice below, the Easy Guide banner, the numbered option steps and the add-on picker. Leave blank to treat every product that way.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "gloves",
    placeholder: "e.g. gloves",
  },
  {
    key: "glove.product.notice-text",
    label: "Made-to-order notice",
    description:
      "Boxed note under the price on made-to-order products. Leave blank to hide.",
    type: "textarea",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue:
      "PLEASE NOTE: Sizes run small and we recommend ordering a size up. Because each LuvGluv pair is made special for you with all your customizations, delivery will take 6-8 weeks. Gold grommets not available at this time.",
    placeholder: "Sizing advice, delivery times, anything shoppers must know",
  },
  {
    key: "glove.product.add-to-cart-label",
    label: "Add to cart button",
    description: "Label of the main buy button.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "Add to cart",
  },
  {
    key: "glove.product.unavailable-text",
    label: "Unavailable option text",
    description:
      "Shown under the buy button when the chosen options can't be bought.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "That combination is sold out. Try another option.",
  },
  {
    key: "glove.product.notify-text",
    label: "Back-in-stock text",
    description:
      "Line above the email sign-up shown on sold-out products (when back-in-stock alerts are on).",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue: "Email me when this is back in stock.",
  },
  {
    key: "glove.product.coming-soon-heading",
    label: "Coming soon heading",
    description: "Shown in place of the buy button on coming-soon products.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "Coming soon",
  },
  {
    key: "glove.product.coming-soon-body",
    label: "Coming soon message",
    description: "Line under the coming soon heading. Leave blank to hide.",
    type: "textarea",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue:
      "This style isn't available to order just yet. Check back soon!",
  },
  {
    key: "glove.product.description-heading",
    label: "Description heading",
    description:
      "Heading of the full description below the product. The block hides when the product has no description.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "Description",
  },
  {
    key: "glove.product.reviews-heading",
    label: "Reviews heading",
    description:
      "Heading over the review list. Only shown when reviews are on for your store.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "Reviews",
  },
  {
    key: "glove.product.review-prompt",
    label: "Write a review heading",
    description:
      "Heading of the invitation to write a review. With no reviews yet it is the whole empty state, with the line and button below.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "Wearing hers?",
  },
  {
    key: "glove.product.review-body",
    label: "Write a review text",
    description: "One line under the write-a-review heading.",
    type: "textarea",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue:
      "Tell us how she loves her LuvGluv. Reviews appear once approved.",
  },
  {
    key: "glove.product.review-button-label",
    label: "Write a review button",
    description: "Label of the button that opens the review form.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "Write a review",
  },
  {
    key: "glove.product.related-heading",
    label: "Related products heading",
    description:
      "Heading of the related products panel at the bottom. The panel hides when there is nothing to show.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "Pairs beautifully with",
  },
];

// ─── Add-on picker ("Complete your LuvGluv") ───────────────────────────────

const addonsData: TemplateField[] = [
  {
    key: "glove.product.addons-heading",
    label: "Heading",
    description:
      "Heading of the chain and charm picker on made-to-order products.",
    type: "text",
    page: "product",
    group: "product.addons",
    gridColumn: "col-span-1",
    defaultValue: "Complete your LuvGluv",
  },
  {
    key: "glove.product.addons-helper",
    label: "Helper text",
    description: "One line under the picker heading. Leave blank to hide.",
    type: "textarea",
    page: "product",
    group: "product.addons",
    gridColumn: "col-span-1",
    defaultValue:
      "Your first charm is included with every glove — add extras here.",
  },
  {
    key: "glove.product.chains-collection-slug",
    label: "Chains collection",
    description:
      "Slug of the collection whose products fill the Chain row. The row hides when the collection is missing or empty.",
    type: "text",
    page: "product",
    group: "product.addons",
    gridColumn: "col-span-1",
    defaultValue: "chains",
    placeholder: "e.g. chains",
  },
  {
    key: "glove.product.charms-collection-slug",
    label: "Charms collection",
    description:
      "Slug of the collection whose products fill the Charms row. The row hides when the collection is missing or empty.",
    type: "text",
    page: "product",
    group: "product.addons",
    gridColumn: "col-span-1",
    defaultValue: "charms",
    placeholder: "e.g. charms",
  },
  {
    key: "glove.product.chain-label",
    label: "Chain row label",
    description: "Label of the chain row (one choice).",
    type: "text",
    page: "product",
    group: "product.addons",
    gridColumn: "col-span-1",
    defaultValue: "Chain",
  },
  {
    key: "glove.product.no-chain-label",
    label: "No chain option",
    description: "First choice in the chain row, for gloves without a chain.",
    type: "text",
    page: "product",
    group: "product.addons",
    gridColumn: "col-span-1",
    defaultValue: "No chain",
  },
  {
    key: "glove.product.charms-label",
    label: "Charms row label",
    description: "Label of the charms row (up to three choices).",
    type: "text",
    page: "product",
    group: "product.addons",
    gridColumn: "col-span-1",
    defaultValue: "Charms",
  },
  {
    key: "glove.product.charms-limit-text",
    label: "Charm limit note",
    description: "Shown beside the charms row label.",
    type: "text",
    page: "product",
    group: "product.addons",
    gridColumn: "col-span-1",
    defaultValue: "Choose up to 3",
  },
  {
    key: "glove.product.glove-line-label",
    label: "Total line: glove",
    description:
      "Word for the glove itself in the running total under the picker.",
    type: "text",
    page: "product",
    group: "product.addons",
    gridColumn: "col-span-1",
    defaultValue: "Glove",
  },
  {
    key: "glove.product.charm-line-label",
    label: "Total line: charm",
    description: "Word for each charm in the running total.",
    type: "text",
    page: "product",
    group: "product.addons",
    gridColumn: "col-span-1",
    defaultValue: "Charm",
  },
  {
    key: "glove.product.total-label",
    label: "Total line: total",
    description: "Word before the grand total in the running total.",
    type: "text",
    page: "product",
    group: "product.addons",
    gridColumn: "col-span-1",
    defaultValue: "Total",
  },
];

// ─── Support rows (B6.2: each its own hideable section) ────────────────────

const supportData: TemplateField[] = [
  {
    key: "glove.product.shipping-summary",
    label: "Shipping note",
    description:
      "Short note in the Shipping row on every product page. A link to your shipping policy is added automatically when that page is published. Leave blank to show just the link, or nothing if the policy isn't published.",
    type: "textarea",
    page: "product",
    group: "product.shipping",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "e.g. Made to order and shipped within 6-8 weeks.",
  },
  {
    key: "glove.product.returns-summary",
    label: "Returns note",
    description:
      "Short note in the Returns row on every product page. A link to your refund policy is added automatically when that page is published. Leave blank to show just the link, or nothing if the policy isn't published.",
    type: "textarea",
    page: "product",
    group: "product.returns",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "e.g. Personalised pairs can't be returned.",
  },
  {
    key: "glove.product.question-text",
    label: "Questions link",
    description:
      "One line under the product details that links to your contact page. Leave blank to hide.",
    type: "text",
    page: "product",
    group: "product.questions",
    gridColumn: "col-span-full",
    defaultValue: "Questions about this product? Contact us.",
    placeholder: "e.g. Need help choosing? Ask us.",
  },
];

// ─── Exports ────────────────────────────────────────────────────────────────

export const gloveProductData: TemplateField[] = [
  ...guideData,
  ...detailsData,
  ...addonsData,
  ...supportData,
];

export const gloveProductFieldGroups: TemplateFieldGroup[] = [
  {
    id: "product.guide",
    title: "Easy Guide banner",
    description:
      "Banner above the options on made-to-order products that links to the Easy Guide",
    icon: "🧭",
    columns: 2,
  },
  {
    id: "product.details",
    title: "Product page",
    description:
      "Made-to-order notice, buy button, description, reviews and related products on every product page",
    icon: "🧤",
    columns: 2,
  },
  {
    id: "product.addons",
    title: "Chain and charm picker",
    description:
      'The "Complete your LuvGluv" picker on made-to-order products: which collections fill it and its labels',
    icon: "🔗",
    columns: 2,
  },
  {
    id: "product.shipping",
    title: "Shipping row",
    description: "Shipping note and policy link on every product page",
    icon: "🚚",
    columns: 1,
  },
  {
    id: "product.returns",
    title: "Returns row",
    description: "Returns note and policy link on every product page",
    icon: "↩️",
    columns: 1,
  },
  {
    id: "product.questions",
    title: "Questions row",
    description: "Contact link on every product page",
    icon: "❓",
    columns: 1,
  },
];

export const gloveProductSections: TemplateSection[] = [
  {
    id: "product.guide",
    page: "product",
    title: "Easy Guide banner",
    description:
      "Banner above the options on made-to-order products that links to the Easy Guide",
    groupIds: ["product.guide"],
    order: 0,
    hideable: true,
  },
  {
    id: "product.details",
    page: "product",
    title: "Product page",
    description:
      "Gallery, price, made-to-order notice, options, buy button, description, reviews and related products",
    groupIds: ["product.details"],
    order: 1,
    hideable: false,
    links: [SECTION_LINKS.products],
  },
  {
    id: "product.addons",
    page: "product",
    title: "Chain and charm picker",
    description:
      '"Complete your LuvGluv" picker on made-to-order products, filled from your chains and charms collections',
    groupIds: ["product.addons"],
    order: 2,
    hideable: true,
    links: [SECTION_LINKS.products],
  },
  {
    id: "product.shipping",
    page: "product",
    title: "Shipping row",
    description: "Shipping note and policy link, in its own row.",
    groupIds: ["product.shipping"],
    order: 3,
    hideable: true,
    links: [SECTION_LINKS.products],
  },
  {
    id: "product.returns",
    page: "product",
    title: "Returns row",
    description: "Returns note and policy link, in its own row.",
    groupIds: ["product.returns"],
    order: 4,
    hideable: true,
    links: [SECTION_LINKS.products],
  },
  {
    id: "product.questions",
    page: "product",
    title: "Questions row",
    description: "Contact link, in its own row.",
    groupIds: ["product.questions"],
    order: 5,
    hideable: true,
    links: [SECTION_LINKS.products],
  },
];

/** Every key above, for `resolveFields`. */
export const GLOVE_PRODUCT_FIELD_KEYS = gloveProductData.map((f) => f.key);
