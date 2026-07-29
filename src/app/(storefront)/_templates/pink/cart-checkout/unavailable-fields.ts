import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Checkout-unavailable fields — design.md → "Checkout unavailable
 * [extrapolated]". Rendered only when the store hasn't connected Stripe yet
 * (`checkout/page.tsx` renders `<t.CheckoutUnavailable />` with NO props at
 * all, so this component self-fetches the business via the tRPC server
 * caller to resolve owner copy — see `pink-checkout-unavailable.tsx`).
 */
export const pinkUnavailableData: TemplateField[] = [
  {
    key: "pink.checkout.unavailable-heading",
    label: "Checkout Unavailable Heading",
    description:
      "Heading shown when the store hasn't set up payment processing yet.",
    type: "text",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-1",
    defaultValue: "Checkout is closed right now",
  },
  {
    key: "pink.checkout.unavailable-body",
    label: "Checkout Unavailable Body",
    description: "Body copy shown alongside the unavailable heading.",
    type: "textarea",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-full",
    defaultValue:
      "We're not able to take payments at the moment. Get in touch and we'll sort it out with you directly.",
  },
  {
    key: "pink.checkout.unavailable-cta",
    label: "Checkout Unavailable CTA Label",
    description: "Label on the button back to the shop.",
    type: "text",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-1",
    defaultValue: "Back to shop",
  },
];

export const pinkUnavailableFieldGroups: TemplateFieldGroup[] = [
  {
    id: "checkout.unavailable",
    title: "Checkout Unavailable",
    description:
      "Heading, body and CTA shown when the store hasn't connected payments yet",
    icon: "🚫",
    columns: 2,
  } satisfies TemplateFieldGroup,
];
