import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Checkout-unavailable fields, aggregated into the template root `index.ts`.
 * `checkout/page.tsx` renders `<t.CheckoutUnavailable />` with NO props at
 * all when the store hasn't connected Stripe, so `PollenCheckoutUnavailable`
 * self-fetches the business via the tRPC server caller to resolve owner copy
 * when no `customFields` prop is given — see `pollen-checkout-unavailable.tsx`.
 */
export const pollenCheckoutUnavailableData: TemplateField[] = [
  {
    key: "pollen.checkout.unavailable-heading",
    label: "Heading",
    description:
      "Heading shown on the checkout page when the store hasn't set up online payments yet.",
    type: "text",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-1",
    defaultValue: "Checkout unavailable",
    placeholder: "Checkout unavailable",
  },
  {
    key: "pollen.checkout.unavailable-body",
    label: "Body text",
    description: "Message shown below the heading. Leave blank to hide it.",
    type: "textarea",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-full",
    defaultValue:
      "This store isn't taking online payments yet. Please check back soon or contact us.",
  },
  {
    key: "pollen.checkout.unavailable-cta",
    label: "Button text",
    description:
      "Label on the button back to the shop. Leave blank to hide the button.",
    type: "text",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-1",
    defaultValue: "Continue Shopping",
    placeholder: "Continue Shopping",
  },
];

export const pollenCheckoutUnavailableFieldGroups: TemplateFieldGroup[] = [
  {
    id: "checkout.unavailable",
    title: "Checkout unavailable",
    description:
      "Shown on the checkout page when online payments aren't set up yet.",
    icon: "⏸️",
    columns: 2,
  } satisfies TemplateFieldGroup,
];
