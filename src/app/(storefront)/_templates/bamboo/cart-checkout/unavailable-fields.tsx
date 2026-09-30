import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Checkout-unavailable fields — design.md § Layout authority ("Operate
 * surfaces … stay hard-edged and businesslike"), state-consistent typography
 * rule under "Serif/Outfit rulebook". `checkout/page.tsx` renders
 * `<t.CheckoutUnavailable />` with NO props at all when the store hasn't
 * connected Stripe, so `BambooCheckoutUnavailable` self-fetches the business
 * via the tRPC server caller to resolve owner copy when no `customFields`
 * prop is given — see `bamboo-checkout-unavailable.tsx`.
 *
 * No `cart-checkout/index.tsx` exists yet on bamboo (no `checkout.success`
 * field module either), so this stays its own standalone module and is
 * spread directly into the template root `index.tsx`.
 */
export const bambooCheckoutUnavailableData: TemplateField[] = [
  {
    key: "bamboo.checkout.unavailable-heading",
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
    key: "bamboo.checkout.unavailable-body",
    label: "Body text",
    description:
      "Message shown below the heading. Leave blank to hide it.",
    type: "textarea",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-full",
    defaultValue:
      "This store isn't taking online payments yet. Please check back soon or contact us.",
  },
  {
    key: "bamboo.checkout.unavailable-cta",
    label: "Button text",
    description:
      "Label on the button back to the shop. Leave blank to hide the button.",
    type: "text",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-1",
    defaultValue: "Back to shop",
    placeholder: "Back to shop",
  },
];

export const bambooCheckoutUnavailableFieldGroups: TemplateFieldGroup[] = [
  {
    id: "checkout.unavailable",
    title: "Checkout unavailable",
    description:
      "Shown on the checkout page when online payments aren't set up yet.",
    icon: "⏸️",
    columns: 2,
  } satisfies TemplateFieldGroup,
];
