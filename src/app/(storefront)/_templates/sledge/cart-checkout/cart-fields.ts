import type {
  TemplateField,
  TemplateFieldGroup,
  TemplateListItemField,
} from "~/lib/template-fields";
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
export const SLEDGE_CHECKOUT_REASSURANCE_KEY =
  "sledge.checkout.reassurance-lines";
export const SLEDGE_CONFIRMATION_NOTES_KEY =
  "sledge.checkout.confirmation-notes";

/**
 * Built-in rows shown until the owner saves their own (`defaultsWhenEmpty`).
 * These are also the field's `defaultRows` — the editor shows them as real,
 * editable rows and copies them into the saved value on first edit.
 */
export const SLEDGE_CART_REASSURANCE_DEFAULT_ROWS = [
  { text: "Free shipping on qualifying orders" },
  { text: "Each piece handcrafted with care" },
  { text: "All sales final — order what you love" },
] satisfies Record<string, string>[];

/**
 * Checkout's own built-in rows: the cart's minus the free-shipping claim,
 * which shouldn't sit next to the payment button unless the owner opts in by
 * saving their own checkout list.
 */
export const SLEDGE_CHECKOUT_REASSURANCE_DEFAULT_ROWS = [
  { text: "Each piece handcrafted with care" },
  { text: "All sales final — order what you love" },
] satisfies Record<string, string>[];

export const SLEDGE_CONFIRMATION_NOTES_DEFAULT_ROWS = [
  { text: "Each piece is handcrafted with care before it ships." },
  { text: "All sales are final — thank you for supporting the studio." },
] satisfies Record<string, string>[];

/** Reads a `defaultRows`-shaped row's `text` sub-field out to a plain string. */
function textsFromDefaultRows(rows: readonly Record<string, string>[]): string[] {
  return rows.map((r) => r.text ?? "");
}

export const SLEDGE_CART_REASSURANCE_DEFAULTS = textsFromDefaultRows(
  SLEDGE_CART_REASSURANCE_DEFAULT_ROWS,
);
export const SLEDGE_CHECKOUT_REASSURANCE_DEFAULTS = textsFromDefaultRows(
  SLEDGE_CHECKOUT_REASSURANCE_DEFAULT_ROWS,
);
export const SLEDGE_CONFIRMATION_NOTES_DEFAULTS = textsFromDefaultRows(
  SLEDGE_CONFIRMATION_NOTES_DEFAULT_ROWS,
);

/** Shared `{ text }` schema for the cart and checkout reassurance lists. */
const REASSURANCE_ITEM_SCHEMA: TemplateListItemField[] = [
  {
    key: "text",
    label: "Text",
    type: "text",
    description: "One short line, shown in small capitals.",
    placeholder: "e.g. Ships within 3 business days",
  },
];

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
    label: "Reassurance lines in the cart",
    description:
      "Short lines with a small symbol under the checkout button on the cart page. Leave empty to show the built-in lines.",
    type: "list",
    page: "global",
    group: "global.cart",
    gridColumn: "col-span-full",
    itemLabel: "line",
    summaryKey: "text",
    maxItems: 5,
    defaultsWhenEmpty: true,
    defaultRows: SLEDGE_CART_REASSURANCE_DEFAULT_ROWS,
    itemSchema: REASSURANCE_ITEM_SCHEMA,
  },
  {
    key: SLEDGE_CHECKOUT_REASSURANCE_KEY,
    label: "Reassurance lines at checkout",
    description:
      "Short lines with a small symbol under the payment button on the checkout page. Leave empty to show the built-in lines.",
    type: "list",
    page: "global",
    group: "global.cart",
    gridColumn: "col-span-full",
    itemLabel: "line",
    summaryKey: "text",
    maxItems: 5,
    defaultsWhenEmpty: true,
    defaultRows: SLEDGE_CHECKOUT_REASSURANCE_DEFAULT_ROWS,
    itemSchema: REASSURANCE_ITEM_SCHEMA,
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
    defaultRows: SLEDGE_CONFIRMATION_NOTES_DEFAULT_ROWS,
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
      "Empty cart message, cart and checkout reassurance lines, and order confirmation notes.",
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
      "Empty cart message, cart and checkout reassurance lines, and order confirmation notes.",
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
