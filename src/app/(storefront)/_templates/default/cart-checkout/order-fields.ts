import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Order-confirmation copy (page "checkout", group "checkout.confirmation").
 * Rendered by `DefaultOrderConfirmation`, resolved server-side in
 * `DefaultOrderSuccessPage` and passed down as optional string/array props
 * with these same built-in defaults as fallbacks — `DefaultOrderConfirmation`
 * is also imported directly by `ModernOrderSuccessPage` WITHOUT these props,
 * so every prop must be optional and every fallback must match the original
 * hardcoded copy verbatim.
 *
 * Kept free of runtime imports from `~/lib/template-fields` (only `import
 * type`) — that module imports the template root, which (once wired) imports
 * this file for its field/group data, so a runtime import here would cycle.
 * The list field's saved rows are parsed directly in
 * `default-order-success-page.tsx` instead (a leaf component, not part of
 * that cycle) using `getListFieldValue` / `parseTemplateListRows`.
 */

export const CHECKOUT_CONFIRMATION_HEADING_DEFAULT = "Order Confirmed!";
export const CHECKOUT_CONFIRMATION_THANKS_PREFIX_DEFAULT =
  "Thank you for your purchase from";
export const CHECKOUT_CONFIRMATION_NEXT_HEADING_DEFAULT = "What happens next?";
export const CHECKOUT_CONFIRMATION_CONTINUE_BUTTON_DEFAULT =
  "Continue Shopping";

export const CHECKOUT_CONFIRMATION_STEPS_KEY =
  "default.checkout.confirmation-next-steps";

/**
 * Built-in rows shown until the owner saves their own (`defaultsWhenEmpty`).
 * These are also the field's `defaultRows` below — the editor shows them as
 * real, editable rows and copies them into the saved value on the row's
 * first edit.
 */
export const CHECKOUT_CONFIRMATION_STEPS_DEFAULT_ROWS = [
  { text: "You'll receive an email confirmation shortly" },
  { text: "We'll notify you when your order ships" },
  { text: "Track your order status via email" },
] satisfies Record<string, string>[];

export const CHECKOUT_CONFIRMATION_STEPS_DEFAULTS =
  CHECKOUT_CONFIRMATION_STEPS_DEFAULT_ROWS.map((row) => row.text);

const confirmationData: TemplateField[] = [
  {
    key: "default.checkout.confirmation-heading",
    label: "Heading",
    description: "Heading at the top of the order confirmation page.",
    type: "text",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-1",
    defaultValue: CHECKOUT_CONFIRMATION_HEADING_DEFAULT,
    placeholder: "e.g. Thank you for your order",
  },
  {
    key: "default.checkout.confirmation-thanks-prefix",
    label: "Thank-you line prefix",
    description:
      'Text shown before your business name on the order confirmation page, e.g. "Thank you for your purchase from [business name]".',
    type: "text",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-full",
    defaultValue: CHECKOUT_CONFIRMATION_THANKS_PREFIX_DEFAULT,
    placeholder: "e.g. Thanks so much for shopping with",
  },
  {
    key: "default.checkout.confirmation-next-heading",
    label: "Next-steps heading",
    description: "Heading above the list of next steps.",
    type: "text",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-1",
    defaultValue: CHECKOUT_CONFIRMATION_NEXT_HEADING_DEFAULT,
    placeholder: "e.g. Here's what to expect",
  },
  {
    key: CHECKOUT_CONFIRMATION_STEPS_KEY,
    label: "Next steps",
    description:
      "Short lines listed under the next-steps heading. Leave empty to show the built-in steps.",
    type: "list",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-full",
    itemLabel: "step",
    summaryKey: "text",
    maxItems: 6,
    defaultsWhenEmpty: true,
    defaultRows: CHECKOUT_CONFIRMATION_STEPS_DEFAULT_ROWS,
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
  {
    key: "default.checkout.confirmation-continue-button",
    label: "Continue shopping button",
    description:
      "Label on the button back to the shop. Leave blank to hide the button.",
    type: "text",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-1",
    defaultValue: CHECKOUT_CONFIRMATION_CONTINUE_BUTTON_DEFAULT,
    placeholder: "e.g. Keep browsing",
  },
];

export const defaultOrderData: TemplateField[] = [...confirmationData];

export const defaultOrderFieldGroups: TemplateFieldGroup[] = [
  {
    id: "checkout.confirmation",
    title: "Order confirmation",
    description:
      "Heading, thank-you line, next-steps list, and button on the order confirmation page.",
    icon: "✅",
    columns: 2,
  },
];
