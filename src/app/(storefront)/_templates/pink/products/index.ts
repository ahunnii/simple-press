import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { listRowsFromDefaults } from "~/lib/lucide-template-icons";
import { SECTION_LINKS } from "~/lib/section-links";

/**
 * Product-page fields for the `pink` template.
 *
 * These fields live on `page: "product"` so the editor shows a "Product"
 * page entry that previews a sample product (one set of fields applied to
 * every product page). Field KEYS keep the legacy `pink.global.product-`
 * prefix — owner-saved values are keyed by these strings, so renaming them
 * would orphan saved content; fields added later use `pink.product.*`. The
 * gallery and per-product details (name, price, description, specs) are fully
 * DB-driven. `product.details` holds the copy around the buy panel (notes,
 * question link, coming-soon / sold-out / stock text).
 */

// ─── Built-in list defaults ─────────────────────────────────────────────────
// Text copied verbatim from the pre-migration `DEFAULT_PANELS` constant in
// `pink-product-page.tsx`.

const PINK_PRODUCT_PANELS_DEFAULT_ROWS = [
  {
    title: "Care & keeping",
    body: "Keep out of direct sun and away from damp. Ask us if you have questions about caring for a piece.",
  },
  {
    title: "Custom orders",
    body: "Want something close to this but not quite? Reach out and we'll talk it through.",
  },
] satisfies Record<string, string>[];

export const pinkProductData: TemplateField[] = [
  // ── product.details (new keys use pink.product.*) ────────────────
  {
    key: "pink.product.shipping-note",
    label: "Shipping note",
    description:
      "Short shipping note shown under the buy button on every product. Leave blank to hide. When your Shipping Policy page is published, a link to it appears next to the note.",
    type: "textarea",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "e.g. Ships within 5 business days.",
  },
  {
    key: "pink.product.returns-note",
    label: "Returns note",
    description:
      "Short returns note shown under the buy button on every product. Leave blank to hide. When your Returns & Refunds Policy page is published, a link to it appears next to the note.",
    type: "textarea",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "e.g. Returns accepted within 14 days.",
  },
  {
    key: "pink.global.product-question",
    label: "Question line",
    description:
      "One short line under the buy button, followed by a link to your contact page. Leave blank to hide the line and the link.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue: "Have a question about this piece before you buy?",
    placeholder: "e.g. Not sure about sizing?",
  },
  {
    key: "pink.product.question-link-label",
    label: "Question link text",
    description:
      "Text of the contact-page link after the question line. Leave blank to show the question line without a link.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "Ask us a question",
    placeholder: "e.g. Get in touch",
  },
  {
    key: "pink.product.stock-untracked-label",
    label: "Stock line for untracked items",
    description:
      "Shown under the buy button on products that don't track inventory, e.g. Made to order. Leave blank to hide.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "e.g. Made to order",
  },
  {
    key: "pink.product.coming-soon-label",
    label: "Coming soon heading",
    description:
      "Shown in place of the buy button, and as a tag on the photo, on products marked as coming soon.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "Coming soon",
    placeholder: "e.g. Available soon",
  },
  {
    key: "pink.product.coming-soon-message",
    label: "Coming soon message",
    description:
      "Line under the coming soon heading on products marked as coming soon. Leave blank to hide.",
    type: "textarea",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue: "This piece isn't available yet — check back soon.",
    placeholder: "e.g. Back next month.",
  },
  {
    key: "pink.product.sold-out-label",
    label: "Sold out button text",
    description:
      "Text on the disabled buy button when a product or option is out of stock.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "Sold out",
    placeholder: "e.g. Out of stock",
  },
  {
    key: "pink.product.sold-out-message",
    label: "Sold out message",
    description:
      "Line above the back-in-stock email sign-up on sold-out products. Leave blank to use a built-in line.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue: "Get notified when it's back in stock.",
    placeholder: "e.g. Want one? Leave your email.",
  },

  // ── product.panels (keys keep legacy pink.global.product- prefix) ───────────────────────────────────────────────
  {
    key: "pink.global.product-panels",
    label: "Information rows",
    description:
      "Expandable rows under every product, such as care instructions or custom orders. Leave empty to show the built-in rows.",
    type: "list",
    page: "product",
    group: "product.panels",
    gridColumn: "col-span-full",
    maxItems: 6,
    itemLabel: "row",
    defaultsWhenEmpty: true,
    defaultRows: PINK_PRODUCT_PANELS_DEFAULT_ROWS,
    itemSchema: [
      {
        key: "title",
        label: "Title",
        type: "text",
        description: "The row's heading, shown while it's collapsed.",
        placeholder: "e.g. Care & keeping",
      },
      {
        key: "body",
        label: "Text",
        type: "textarea",
        description: "Shown when the row is opened.",
        placeholder: "A sentence or two",
      },
    ],
  },

  // ── product.story ────────────────────────────────────────────────
  {
    key: "pink.global.product-story-image",
    label: "Image",
    description:
      "1:1 image beside the heading in the section under the accordion.",
    type: "image",
    page: "product",
    group: "product.story",
    gridColumn: "col-span-full",
    // Empty on purpose — this sits on a dark band; see the homepage hero-image.
    defaultValue: "",
  },
  {
    key: "pink.global.product-story-heading",
    label: "Heading",
    type: "text",
    page: "product",
    group: "product.story",
    gridColumn: "col-span-1",
    description: "Heading in the section under every product's accordion.",
    defaultValue: "Every piece starts on the same table.",
  },
  {
    key: "pink.global.product-story-body",
    label: "Body text",
    description: "One or two sentences under the heading above.",
    type: "textarea",
    page: "product",
    group: "product.story",
    gridColumn: "col-span-full",
    defaultValue:
      "100% wool filling, cotton fabrics, polymer clay faces. Every piece is worked by hand, one at a time, and no two come out the same.",
  },

  // ── product.related ──────────────────────────────────────────────
  {
    key: "pink.global.product-related-heading",
    label: "Heading",
    description: "Heading over the related-products grid.",
    type: "text",
    page: "product",
    group: "product.related",
    gridColumn: "col-span-1",
    defaultValue: "From the same hands",
  },
  {
    key: "pink.global.product-related-link-label",
    label: "Link text",
    description: "Link beside the heading, to the full shop.",
    type: "text",
    page: "product",
    group: "product.related",
    gridColumn: "col-span-1",
    defaultValue: "See everything →",
  },
];

export const pinkProductFieldGroups: TemplateFieldGroup[] = [
  {
    id: "product.details",
    title: "Product details",
    description:
      "Text around the buy button on every product: shipping and returns notes, the question link, and coming-soon, sold-out and stock lines",
    icon: "🛍️",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "product.panels",
    title: "Accordion",
    description:
      "Expandable rows under every product's buy button, such as care and custom orders.",
    icon: "📦",
    columns: 1,
  } satisfies TemplateFieldGroup,
  {
    id: "product.story",
    title: "Studio story",
    description: "The section below the accordion: image and copy.",
    icon: "🧶",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "product.related",
    title: "Related products",
    description: "Heading and link over the related-products grid.",
    icon: "🔗",
    columns: 2,
  } satisfies TemplateFieldGroup,
];

export const pinkProductSections: TemplateSection[] = [
  {
    id: "product.details",
    page: "product",
    title: "Product details",
    description:
      "Text around the buy button on every product: shipping and returns notes, the question link, and coming-soon, sold-out and stock lines",
    groupIds: ["product.details"],
    order: 0,
    hideable: false,
    links: [SECTION_LINKS.products],
  },
  {
    id: "product.panels",
    page: "product",
    title: "Accordion",
    description:
      "Expandable rows under every product's buy button, such as care and custom orders",
    groupIds: ["product.panels"],
    order: 1,
    hideable: true,
  },
  {
    id: "product.story",
    page: "product",
    title: "Studio story",
    description: "The section below the accordion: image and copy",
    groupIds: ["product.story"],
    order: 2,
    hideable: true,
  },
  {
    id: "product.related",
    page: "product",
    title: "Related products",
    description: "Heading and link over the related-products grid",
    groupIds: ["product.related"],
    order: 3,
    hideable: true,
    links: [SECTION_LINKS.products],
  },
];

// ─── Derived storefront constants ──────────────────────────────────────────

export const DEFAULT_PINK_PRODUCT_PANELS = listRowsFromDefaults(
  PINK_PRODUCT_PANELS_DEFAULT_ROWS,
  "default-panel",
);
