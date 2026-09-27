import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Cart + checkout wording (page "global", group "global.cart" — the pollen
 * precedent for cart copy). The root `index.ts` spreads `sledgeCartData` /
 * `sledgeCartFieldGroups`; `sections.ts` spreads `sledgeCartSections`.
 *
 * The cart, checkout and order-confirmation components are client
 * components, so the server pages resolve these with `resolveSledgeTextList`
 * (`./text-list.ts`) and pass plain `{ text, index }` rows down — never a
 * function prop.
 *
 * This module must stay free of RUNTIME imports from `~/lib/template-fields`:
 * that module imports the template root, which imports this file.
 */
export const SLEDGE_CART_REASSURANCE_KEY = "sledge.cart.reassurance-lines";
export const SLEDGE_CONFIRMATION_NOTES_KEY =
  "sledge.checkout.confirmation-notes";

/** Built-in rows shown until the owner saves their own (`defaultsWhenEmpty`). */
export const SLEDGE_CART_REASSURANCE_DEFAULTS = [
  "Free shipping on qualifying orders",
  "Each piece handcrafted with care",
  "All sales final — order what you love",
] as const;

/**
 * Checkout's built-in rows: the cart's minus the free-shipping claim, which
 * shouldn't sit next to the payment button unless the owner opts in by
 * saving their own list (a saved list is shared by cart and checkout).
 */
export const SLEDGE_CHECKOUT_REASSURANCE_DEFAULTS = [
  "Each piece handcrafted with care",
  "All sales final — order what you love",
] as const;

export const SLEDGE_CONFIRMATION_NOTES_DEFAULTS = [
  "Each piece is handcrafted with care before it ships.",
  "All sales are final — thank you for supporting the studio.",
] as const;

export const sledgeCartData: TemplateField[] = [
  {
    key: "sledge.cart.empty-text",
    label: "Empty cart message",
    description:
      "Message on the cart page when there's nothing in the cart, above the shop button.",
    type: "text",
    page: "global",
    group: "global.cart",
    gridColumn: "col-span-full",
    defaultValue: "Your bag is empty. Browse the shop and add pieces you love.",
    placeholder: "One short sentence",
  },
  {
    key: SLEDGE_CART_REASSURANCE_KEY,
    label: "Reassurance lines",
    description:
      "Short lines with a small symbol under the checkout button on the cart page, and under the payment button at checkout. Leave empty to show the built-in lines (checkout's built-in lines leave out free shipping).",
    type: "list",
    page: "global",
    group: "global.cart",
    gridColumn: "col-span-full",
    itemLabel: "line",
    summaryKey: "text",
    maxItems: 5,
    defaultsWhenEmpty: true,
    itemSchema: [
      {
        key: "text",
        label: "Text",
        type: "text",
        description: "One short line, shown in small capitals.",
        placeholder: "e.g. Ships within 3 business days",
      },
    ],
  },
  {
    key: SLEDGE_CONFIRMATION_NOTES_KEY,
    label: "Order confirmation notes",
    description:
      "Extra lines in the What happens next panel on the order confirmation page, after the email and tracking notes. Leave empty to show the built-in lines.",
    type: "list",
    page: "global",
    group: "global.cart",
    gridColumn: "col-span-full",
    itemLabel: "note",
    summaryKey: "text",
    maxItems: 4,
    defaultsWhenEmpty: true,
    itemSchema: [
      {
        key: "text",
        label: "Text",
        type: "text",
        description: "One short sentence.",
        placeholder: "e.g. Orders ship within 3 business days.",
      },
    ],
  },
];

export const sledgeCartFieldGroups: TemplateFieldGroup[] = [
  {
    id: "global.cart",
    title: "Cart and checkout",
    description:
      "Empty cart message, reassurance lines, and order confirmation notes.",
    icon: "🛒",
    columns: 1,
  },
];

export const sledgeCartSections: TemplateSection[] = [
  {
    id: "global.cart",
    page: "global",
    title: "Cart and checkout",
    description:
      "Empty cart message, reassurance lines, and order confirmation notes.",
    groupIds: ["global.cart"],
    order: 3,
    hideable: false,
  },
];

// Decorative glyphs, fixed per rendered position (cycling past the end) so
// the built-in rows look exactly as they did before these became fields.
const REASSURANCE_GLYPHS = ["✓", "✱", "↺"] as const;
const CONFIRMATION_GLYPHS = ["✱", "✓"] as const;

export function sledgeReassuranceGlyph(position: number): string {
  return REASSURANCE_GLYPHS[position % REASSURANCE_GLYPHS.length] ?? "✓";
}

export function sledgeConfirmationGlyph(position: number): string {
  return CONFIRMATION_GLYPHS[position % CONFIRMATION_GLYPHS.length] ?? "✓";
}
