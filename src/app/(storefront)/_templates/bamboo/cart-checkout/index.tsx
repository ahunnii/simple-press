import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Order-confirmation field definitions ─────────────────────────────────
//
// Kept in a clearly separate exported pair (`bambooCheckoutSuccessData` /
// `bambooCheckoutSuccessFieldGroups`) so a sibling `checkout.unavailable`
// module can live in this same directory without either agent clobbering
// the other's exports.

const checkoutSuccessData: TemplateField[] = [
  {
    key: "bamboo.checkout.success-note",
    label: "Note after purchase",
    description:
      "Optional message on the order confirmation page, such as when orders ship. Leave blank to hide.",
    type: "textarea",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "e.g. Orders usually ship within 2 business days.",
  },
];

export const bambooCheckoutSuccessData: TemplateField[] = checkoutSuccessData;

export const bambooCheckoutSuccessFieldGroups: TemplateFieldGroup[] = [
  {
    id: "checkout.success",
    title: "Order confirmation",
    description:
      "Page shoppers see right after paying. Pickup details come from Settings.",
    icon: "✅",
  },
];
