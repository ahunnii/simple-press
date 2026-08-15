import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

/**
 * Product-page fields for the `pink` template.
 *
 * These fields live on `page: "product"` so the editor shows a "Product"
 * page entry that previews a sample product (one set of fields applied to
 * every product page). Field KEYS keep the legacy `pink.global.product-`
 * prefix — owner-saved values are keyed by these strings, so renaming them
 * would orphan saved content. The gallery and per-product details (name,
 * price, description, specs) are fully DB-driven and have no fields/section
 * of their own.
 */
export const pinkProductData: TemplateField[] = [
  // ── product.panels (keys keep legacy pink.global.product- prefix) ───────────────────────────────────────────────
  {
    key: "pink.global.product-panels",
    label: "Product Page Accordion",
    description:
      "Rows shown in the accordion under every product's buy box — care instructions, shipping, custom orders, etc. Leave empty to use the built-in example rows.",
    type: "list",
    page: "product",
    group: "product.panels",
    gridColumn: "col-span-full",
    maxItems: 6,
    itemSchema: [
      {
        key: "title",
        label: "Title",
        type: "text",
        placeholder: "Care & keeping",
      },
      { key: "body", label: "Body", type: "textarea", placeholder: "…" },
    ],
  },
  {
    key: "pink.global.product-question",
    label: "Ask a Question Line",
    description:
      'One short line shown under the buy box, e.g. "Have a question about this piece?" — followed by an "Ask us a question" link to /contact. Leave blank to hide (review 2026-07-29, F7).',
    type: "text",
    page: "product",
    group: "product.panels",
    gridColumn: "col-span-full",
    defaultValue: "Have a question about this piece before you buy?",
  },

  // ── product.story ────────────────────────────────────────────────
  {
    key: "pink.global.product-story-image",
    label: "Product Story Image",
    description: "1:1 image on the left of the dark band under the accordion.",
    type: "image",
    page: "product",
    group: "product.story",
    gridColumn: "col-span-full",
    // Empty on purpose — this sits on a dark band; see the homepage hero-image.
    defaultValue: "",
  },
  {
    key: "pink.global.product-story-heading",
    label: "Product Story Heading",
    type: "text",
    page: "product",
    group: "product.story",
    gridColumn: "col-span-1",
    description: "Heading in the dark band under every product's accordion.",
    defaultValue: "Every piece starts on the same table.",
  },
  {
    key: "pink.global.product-story-body",
    label: "Product Story Body",
    description: "One or two sentences under the story heading.",
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
    label: "Related Products Heading",
    description: "Heading over the related-products grid.",
    type: "text",
    page: "product",
    group: "product.related",
    gridColumn: "col-span-1",
    defaultValue: "From the same hands",
  },
  {
    key: "pink.global.product-related-link-label",
    label: "Related Products Link Text",
    description: "Right-aligned link beside the heading.",
    type: "text",
    page: "product",
    group: "product.related",
    gridColumn: "col-span-1",
    defaultValue: "See everything →",
  },
];

export const pinkProductFieldGroups: TemplateFieldGroup[] = [
  {
    id: "product.panels",
    title: "Product Page — Accordion",
    description:
      "Care, shipping and custom order rows shown under every product's buy box",
    icon: "📦",
    columns: 1,
  } satisfies TemplateFieldGroup,
  {
    id: "product.story",
    title: "Product Page — Studio Story",
    description: "The dark band below the accordion: image, copy and stats",
    icon: "🧶",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "product.related",
    title: "Product Page — Related Products",
    description: 'Heading and link over the "you may also like" grid',
    icon: "🔗",
    columns: 2,
  } satisfies TemplateFieldGroup,
];

export const pinkProductSections: TemplateSection[] = [
  {
    id: "product.panels",
    page: "product",
    title: "Product Page — Accordion",
    description:
      "Care, shipping and custom order rows shown under every product's buy box",
    groupIds: ["product.panels"],
    order: 0,
    hideable: true,
  },
  {
    id: "product.story",
    page: "product",
    title: "Product Page — Studio Story",
    description: "The dark band below the accordion: image, copy and stats",
    groupIds: ["product.story"],
    order: 1,
    hideable: true,
  },
  {
    id: "product.related",
    page: "product",
    title: "Product Page — Related Products",
    description: 'Heading and link over the "you may also like" grid',
    groupIds: ["product.related"],
    order: 2,
    hideable: true,
    links: [SECTION_LINKS.products],
  },
];
