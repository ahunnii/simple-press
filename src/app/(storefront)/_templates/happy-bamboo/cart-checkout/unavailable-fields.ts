import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Checkout-unavailable fields. `checkout/page.tsx` renders
 * `<t.CheckoutUnavailable />` with NO props when the store has no Stripe
 * account, so `HappyBambooCheckoutUnavailable` self-fetches the business to
 * resolve owner copy — see `happy-bamboo-checkout-unavailable.tsx`.
 */
export const happyBambooCheckoutUnavailableData: TemplateField[] = [
  {
    key: "happy-bamboo.checkout.unavailable-heading",
    label: "Heading",
    description:
      "Heading shown on the checkout page when the store hasn't set up online payments yet.",
    type: "text",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-1",
    defaultValue: "Checkout unavailable",
    placeholder: "e.g. Checkout is paused",
  },
  {
    key: "happy-bamboo.checkout.unavailable-body",
    label: "Body text",
    description: "Message shown below the heading. Leave blank to hide it.",
    type: "textarea",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-full",
    defaultValue:
      "This store hasn't set up online payments yet. Please contact us to place an order.",
    placeholder: "e.g. We're not taking online orders right now...",
  },
  {
    key: "happy-bamboo.checkout.unavailable-cta",
    label: "Button text",
    description:
      "Label on the button back to the shop. Leave blank to hide the button.",
    type: "text",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-1",
    defaultValue: "Back to shop",
    placeholder: "e.g. Keep browsing",
  },
];

export const happyBambooCheckoutUnavailableFieldGroups: TemplateFieldGroup[] = [
  {
    id: "checkout.unavailable",
    title: "Checkout unavailable",
    description:
      "Shown on the checkout page when online payments aren't set up yet.",
    icon: "⏸️",
    columns: 2,
  } satisfies TemplateFieldGroup,
];
