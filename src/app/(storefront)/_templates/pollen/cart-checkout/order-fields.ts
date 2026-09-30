import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Order-confirmation (`/order/success`) copy, aggregated into the template
 * root `index.ts`. Two groups, one per visual state of the page:
 *
 * - `checkout.confirmation` — the shopper has just paid (`?session_id=` is
 *   present). Rendered by `PollenOrderConfirmation`.
 * - `checkout.no-order` — no session id (bookmarked / shared / stale link).
 *   Rendered by `PollenOrderNotFound`, which also reuses the continue and
 *   my-orders button labels from the confirmation group.
 *
 * Resolved server-side in `pollen-order-success-page.tsx` and handed to the
 * client views as plain strings.
 */
const confirmationData: TemplateField[] = [
  {
    key: "pollen.checkout.confirmation-subtitle",
    label: "Page subtitle",
    description:
      "Small label above the page title at the top of the order confirmation page.",
    type: "text",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-1",
    defaultValue: "Thank You",
    placeholder: "e.g. All done",
  },
  {
    key: "pollen.checkout.confirmation-title",
    label: "Page title",
    description:
      "Main heading at the top of the page shoppers land on after paying.",
    type: "text",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-1",
    defaultValue: "Order Confirmed",
    placeholder: "e.g. Thanks for your order",
  },
  {
    key: "pollen.checkout.confirmation-heading",
    label: "Heading",
    description: "Heading beside the check mark, below the page title.",
    type: "text",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-1",
    defaultValue: "Your order is in",
    placeholder: "e.g. We've got it from here",
  },
  {
    key: "pollen.checkout.confirmation-intro",
    label: "Intro text",
    description: "Short message under the heading. Leave blank to hide it.",
    type: "textarea",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-full",
    defaultValue:
      "Thank you for shopping with us. Your payment went through and we've started getting everything ready.",
    placeholder: "One or two friendly sentences.",
  },
  {
    key: "pollen.checkout.confirmation-next-heading",
    label: "Next steps heading",
    description: "Heading above the list of what happens after the order.",
    type: "text",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-1",
    defaultValue: "What happens next",
    placeholder: "e.g. Next steps",
  },
  {
    key: "pollen.checkout.confirmation-receipt-step",
    label: "Receipt line",
    description:
      "First next step, shown on every order. Leave blank to hide it.",
    type: "text",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-full",
    defaultValue: "A confirmation email with your receipt is on its way.",
    placeholder: "Tell shoppers where their receipt goes.",
  },
  {
    key: "pollen.checkout.confirmation-ship-step",
    label: "Shipping line",
    description: "Next step shown when the order is being shipped.",
    type: "text",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-full",
    defaultValue:
      "We'll email you a tracking number as soon as your order ships.",
    placeholder: "What shoppers can expect before delivery.",
  },
  {
    key: "pollen.checkout.confirmation-pickup-step",
    label: "Pickup line",
    description:
      "Next step shown when the shopper chose in-store pickup. The pickup location from Settings shows below it.",
    type: "text",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-full",
    defaultValue:
      "We'll let you know as soon as your order is ready to pick up.",
    placeholder: "What shoppers can expect before pickup.",
  },
  {
    key: "pollen.checkout.confirmation-general-step",
    label: "Order updates line",
    description:
      "Next step shown when the order's delivery method can't be loaded (for example, when the page is opened in a different browser).",
    type: "text",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-full",
    defaultValue: "We'll email you with updates about your order.",
    placeholder: "A general promise about order updates.",
  },
  {
    key: "pollen.checkout.confirmation-details-heading",
    label: "Order details heading",
    description:
      "Heading on the side panel that lists the order total, receipt email and delivery method.",
    type: "text",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-1",
    defaultValue: "Order Details",
    placeholder: "e.g. Your order",
  },
  {
    key: "pollen.checkout.confirmation-continue-button",
    label: "Continue shopping button",
    description:
      "Label on the button back to the shop (or the homepage when products are turned off). Also used on the order-not-found screen. Leave blank to hide the button.",
    type: "text",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-1",
    defaultValue: "Continue Shopping",
    placeholder: "e.g. Keep browsing",
  },
  {
    key: "pollen.checkout.confirmation-orders-button",
    label: "My orders button",
    description:
      "Label on the button to the shopper's order history. Only shown to signed-in shoppers when order history is turned on. Also used on the order-not-found screen.",
    type: "text",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-1",
    defaultValue: "View My Orders",
    placeholder: "e.g. Track my order",
  },
  {
    key: "pollen.checkout.confirmation-sign-up-button",
    label: "Create account button",
    description:
      "Label on the sign-up button. Only shown to signed-out shoppers when customer accounts are turned on.",
    type: "text",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-1",
    defaultValue: "Create an Account",
    placeholder: "e.g. Sign up",
  },
  {
    key: "pollen.checkout.confirmation-sign-up-text",
    label: "Create account note",
    description:
      "Short line above the sign-up button saying why an account helps. Leave blank to hide it.",
    type: "text",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-full",
    defaultValue:
      "Save your details for next time and keep track of every order.",
    placeholder: "One short reason to sign up.",
  },
];

const notFoundData: TemplateField[] = [
  {
    key: "pollen.checkout.no-order-subtitle",
    label: "Page subtitle",
    description:
      "Small label above the page title when the order confirmation page has no order to show.",
    type: "text",
    page: "checkout",
    group: "checkout.no-order",
    gridColumn: "col-span-1",
    defaultValue: "Order Status",
    placeholder: "e.g. Hmm",
  },
  {
    key: "pollen.checkout.no-order-title",
    label: "Page title",
    description:
      "Main heading when the order confirmation page is opened without an order (for example, from a bookmark).",
    type: "text",
    page: "checkout",
    group: "checkout.no-order",
    gridColumn: "col-span-1",
    defaultValue: "We couldn't find that order",
    placeholder: "e.g. Nothing to show here",
  },
  {
    key: "pollen.checkout.no-order-body",
    label: "Body text",
    description: "Message below the icon. Leave blank to hide it.",
    type: "textarea",
    page: "checkout",
    group: "checkout.no-order",
    gridColumn: "col-span-full",
    defaultValue:
      "This page shows your order right after checkout. If you just placed one, your receipt is waiting in your email.",
    placeholder: "Point shoppers to their receipt or your contact page.",
  },
];

export const pollenOrderConfirmationData: TemplateField[] = [
  ...confirmationData,
  ...notFoundData,
];

export const pollenOrderConfirmationFieldGroups: TemplateFieldGroup[] = [
  {
    id: "checkout.confirmation",
    title: "Order confirmation",
    description:
      "The page shoppers land on after paying: heading, next steps and buttons.",
    icon: "✅",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "checkout.no-order",
    title: "Order not found",
    description:
      "Shown on the order confirmation page when there's no order to show.",
    icon: "🔍",
    columns: 2,
  } satisfies TemplateFieldGroup,
];
