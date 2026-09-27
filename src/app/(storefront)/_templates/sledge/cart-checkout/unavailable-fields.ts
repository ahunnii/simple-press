import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Checkout-unavailable fields. `checkout/page.tsx` renders
 * `<t.CheckoutUnavailable />` with NO props when the store hasn't connected
 * online payments, so `SledgeCheckoutUnavailable` self-fetches the business
 * to resolve the owner's copy — see `sledge-checkout-unavailable.tsx`.
 *
 * The root `index.ts` spreads `sledgeCheckoutUnavailableData` /
 * `sledgeCheckoutUnavailableFieldGroups`; `sections.ts` spreads
 * `sledgeCheckoutUnavailableSections`.
 */
export const sledgeCheckoutUnavailableData: TemplateField[] = [
  {
    key: "sledge.checkout.unavailable-heading",
    label: "Heading",
    description:
      "Heading shown on the checkout page when online payments aren't set up yet.",
    type: "text",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-full",
    defaultValue: "Checkout unavailable",
    placeholder: "A few words",
  },
  {
    key: "sledge.checkout.unavailable-body",
    label: "Message",
    description: "Short message below the heading. Leave blank to hide.",
    type: "textarea",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-full",
    defaultValue:
      "Online checkout isn't available right now. Please get in touch and we'll help you place your order.",
    placeholder: "One or two short sentences",
  },
  {
    key: "sledge.checkout.unavailable-cta",
    label: "Button text",
    description:
      "Label on the button back to the shop. Leave blank to hide the button.",
    type: "text",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-full",
    defaultValue: "Back to shop",
    placeholder: "A short action",
  },
];

export const sledgeCheckoutUnavailableFieldGroups: TemplateFieldGroup[] = [
  {
    id: "checkout.unavailable",
    title: "Checkout unavailable",
    description:
      "Shown on the checkout page when online payments aren't set up yet.",
    icon: "⏸️",
    columns: 1,
  },
];

export const sledgeCheckoutUnavailableSections: TemplateSection[] = [
  {
    id: "checkout.unavailable",
    page: "checkout",
    title: "Checkout unavailable",
    description:
      "Shown on the checkout page when online payments aren't set up yet.",
    groupIds: ["checkout.unavailable"],
    order: 0,
    hideable: false,
  },
];
