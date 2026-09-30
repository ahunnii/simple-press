import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";
import { SECTION_LINKS } from "~/lib/section-links";

/**
 * Product-page fields. They apply to EVERY product page — the visual editor
 * previews them on a representative published product (page "product").
 *
 * Shipping / returns notes and the questions line are blank by default
 * (hidden until the owner writes one); the full policy pages are linked
 * beside the notes only when they're published (`productPolicies` from
 * `shop/[slug]/page.tsx`).
 *
 * The orchestrator spreads `dreamProductData` / `dreamProductFieldGroups`
 * into the root `index.ts` and `dreamProductSections` into `sections.ts`.
 * The product page itself reads these keys through
 * `resolveDreamProductFields` below rather than the root `resolveFields`,
 * so this module never has to import the root (no cycle).
 */
export const dreamProductData: TemplateField[] = [
  {
    key: "dream.product.shipping-note",
    label: "Shipping note",
    description:
      "Short note shown in the Shipping row under the add-to-cart button. Leave blank to hide the note — the row still shows when your shipping policy page is published, with a link to it. Can be hidden independently of the returns and questions rows.",
    type: "textarea",
    page: "product",
    group: "product.shipping",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "e.g. Local delivery and setup are arranged after you order.",
  },
  {
    key: "dream.product.returns-note",
    label: "Returns note",
    description:
      "Short note shown in the Returns row under the add-to-cart button. Leave blank to hide the note — the row still shows when your returns policy page is published, with a link to it. Can be hidden independently of the shipping and questions rows.",
    type: "textarea",
    page: "product",
    group: "product.returns",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "e.g. Rentals are returned the day after your event.",
  },
  {
    key: "dream.product.question-text",
    label: "Questions link",
    description:
      "One line under the add-to-cart button that links to your contact page. Leave blank to hide. Can be hidden independently of the shipping and returns rows.",
    type: "text",
    page: "product",
    group: "product.questions",
    gridColumn: "col-span-full",
    defaultValue: "Questions about this piece? Ask us.",
    placeholder: "e.g. Questions about this rental? Send Selest a note.",
  },
  {
    key: "dream.product.related-heading",
    label: "Related products heading",
    description:
      "Heading above the related products at the bottom of the page. The section only appears when a product has related products. Leave blank to hide the heading.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue: "You might also like",
    placeholder: "A short heading",
  },
  {
    key: "dream.product.coming-soon-heading",
    label: "Coming soon heading",
    description:
      "Shown in place of the add-to-cart button on products marked as coming soon.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue: "Coming soon",
    placeholder: "A few words",
  },
  {
    key: "dream.product.coming-soon-body",
    label: "Coming soon message",
    description:
      "Line below the coming soon heading on products marked as coming soon. Leave blank to hide.",
    type: "textarea",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue: "This piece isn't available yet. Check back soon.",
    placeholder: "e.g. Available for bookings from next month.",
  },
];

export const dreamProductFieldGroups: TemplateFieldGroup[] = [
  {
    id: "product.details",
    title: "Product page",
    description:
      "Text shown on every product page, around the add-to-cart button.",
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
      "Contact link shown under the add-to-cart button on every product page. Can be hidden independently of the shipping and returns rows.",
    icon: "❓",
    columns: 1,
  },
];

export const dreamProductSections: TemplateSection[] = [
  {
    id: "product.details",
    page: "product",
    title: "Product page",
    description:
      "Text shown on every product page, around the add-to-cart button.",
    groupIds: ["product.details"],
    order: 0,
    hideable: false,
    links: [SECTION_LINKS.products],
  },
  {
    id: "product.shipping",
    page: "product",
    title: "Shipping row",
    description:
      "Shipping note under the add-to-cart button on every product page. Hide it without hiding returns or questions.",
    groupIds: ["product.shipping"],
    order: 1,
    hideable: true,
  },
  {
    id: "product.returns",
    page: "product",
    title: "Returns row",
    description:
      "Returns note under the add-to-cart button on every product page. Hide it without hiding shipping or questions.",
    groupIds: ["product.returns"],
    order: 2,
    hideable: true,
  },
  {
    id: "product.questions",
    page: "product",
    title: "Questions row",
    description:
      "Contact link under the add-to-cart button on every product page. Hide it without hiding shipping or returns.",
    groupIds: ["product.questions"],
    order: 3,
    hideable: true,
  },
];

const _dreamProductFieldMap = new Map(
  dreamProductData.map((field) => [field.key, field]),
);

/**
 * Local resolver over just the product-page fields — same semantics as the
 * root `resolveFields` (a saved `""` stays blank so the owner can hide an
 * optional line), without importing the template root from a page module.
 */
export function resolveDreamProductFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _dreamProductFieldMap);
}
