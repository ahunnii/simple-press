import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Checkout fields (page "checkout"): the progress bar shared by the cart,
 * checkout and order confirmation pages, the checkout form copy, and the
 * "checkout unavailable" screen. Not reachable in /editor (the preview cart is
 * always empty); edited in the platform-admin advanced editor.
 */

export const GLOVE_STEP_FIELD_KEYS = {
  cart: "glove.checkout.step-cart",
  checkout: "glove.checkout.step-checkout",
  complete: "glove.checkout.step-complete",
} as const;

export const GLOVE_STEP_FIELD_LIST = Object.values(GLOVE_STEP_FIELD_KEYS);

export const gloveCheckoutData: TemplateField[] = [
  // ─── Progress bar ──────────────────────────────────────────────────────
  {
    key: GLOVE_STEP_FIELD_KEYS.cart,
    label: "Bag step label",
    description:
      "First step in the progress bar at the top of the cart, checkout and order pages.",
    type: "text",
    page: "checkout",
    group: "checkout.steps",
    gridColumn: "col-span-1",
    defaultValue: "Your bag",
    placeholder: "e.g. Shopping cart",
  },
  {
    key: GLOVE_STEP_FIELD_KEYS.checkout,
    label: "Checkout step label",
    description: "Second step in the progress bar.",
    type: "text",
    page: "checkout",
    group: "checkout.steps",
    gridColumn: "col-span-1",
    defaultValue: "Details",
    placeholder: "e.g. Checkout",
  },
  {
    key: GLOVE_STEP_FIELD_KEYS.complete,
    label: "Order complete step label",
    description: "Last step in the progress bar.",
    type: "text",
    page: "checkout",
    group: "checkout.steps",
    gridColumn: "col-span-1",
    defaultValue: "Done",
    placeholder: "e.g. Order complete",
  },

  // ─── Checkout form ─────────────────────────────────────────────────────
  {
    key: "glove.checkout.details-heading",
    label: "Contact details heading",
    description: "Heading above the name, email and phone fields.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Your details",
    placeholder: "e.g. Contact details",
  },
  {
    key: "glove.checkout.delivery-heading",
    label: "Delivery heading",
    description:
      "Heading above the ship or pick up choice. Only shown when the store offers in-store pickup.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Delivery method",
    placeholder: "e.g. How should we get it to you?",
  },
  {
    key: "glove.checkout.shipping-heading",
    label: "Shipping address heading",
    description: "Heading above the shipping address fields.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Shipping address",
    placeholder: "e.g. Where to?",
  },
  {
    key: "glove.checkout.discount-heading",
    label: "Discount code heading",
    description:
      "Heading above the discount code box. Only shown when discount codes are switched on for the store.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Have a promo code?",
    placeholder: "e.g. Discount code",
  },
  {
    key: "glove.checkout.summary-heading",
    label: "Order summary heading",
    description: "Heading on the card that lists the items being bought.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Your order",
    placeholder: "e.g. Order summary",
  },
  {
    key: "glove.checkout.submit-label",
    label: "Payment button label",
    description: "Button that sends the customer to the secure payment page.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Continue to payment",
    placeholder: "e.g. Place order",
  },
  {
    key: "glove.checkout.tax-note",
    label: "Tax note",
    description:
      "Small line under the order total about tax and the final amount. Leave blank to hide it.",
    type: "textarea",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-full",
    defaultValue: "Tax and the final total are confirmed on the payment page.",
    placeholder: "e.g. Tax is added at payment.",
  },
  {
    key: "glove.checkout.secure-note",
    label: "Secure payment note",
    description:
      "Reassurance line under the payment button. Leave blank to hide it.",
    type: "textarea",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-full",
    defaultValue:
      "All transactions are secure and encrypted. Payment is handled by Stripe.",
    placeholder: "e.g. Your payment details are never stored here.",
  },
  {
    key: "glove.checkout.empty-heading",
    label: "Empty cart heading",
    description: "Heading shown if someone opens checkout with an empty cart.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Your bag is waiting for its first pair",
    placeholder: "e.g. Nothing to check out yet",
  },
  {
    key: "glove.checkout.empty-cta",
    label: "Empty cart button label",
    description:
      "Button under the empty cart message that goes to the shop. Leave blank to hide it.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Start shopping",
    placeholder: "e.g. Browse the shop",
  },

  // ─── Checkout unavailable ──────────────────────────────────────────────
  {
    key: "glove.checkout.unavailable-heading",
    label: "Heading",
    description:
      "Heading shown on the checkout page when the store has not set up online payments yet.",
    type: "text",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-1",
    defaultValue: "Checkout unavailable",
    placeholder: "e.g. Checkout is paused",
  },
  {
    key: "glove.checkout.unavailable-body",
    label: "Body text",
    description: "Message shown below the heading. Leave blank to hide it.",
    type: "textarea",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-full",
    defaultValue:
      "This store hasn't set up online payments yet. Please contact us to place an order.",
    placeholder: "e.g. We are not taking online orders right now.",
  },
  {
    key: "glove.checkout.unavailable-cta",
    label: "Shop button label",
    description:
      "Label on the button back to the shop. Leave blank to hide the button.",
    type: "text",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-1",
    defaultValue: "Back to shop",
    placeholder: "e.g. Keep browsing",
  },
  {
    key: "glove.checkout.unavailable-contact",
    label: "Contact link label",
    description:
      "Label on the link to the contact page. Leave blank to hide the link.",
    type: "text",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-1",
    defaultValue: "Contact us",
    placeholder: "e.g. Get in touch",
  },
];

export const gloveCheckoutFieldGroups: TemplateFieldGroup[] = [
  {
    id: "checkout.steps",
    title: "Progress bar",
    description:
      "The cart, checkout and order complete steps shown at the top of those pages",
    icon: "➡️",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "checkout.main",
    title: "Checkout",
    description:
      "Headings, buttons and notes on the checkout form and order summary",
    icon: "💳",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "checkout.unavailable",
    title: "Checkout unavailable",
    description:
      "Shown on the checkout page when online payments are not set up yet",
    icon: "⏸️",
    columns: 2,
  } satisfies TemplateFieldGroup,
];

/** Checkout screens are the page itself, so none of them is hideable. */
export const gloveCheckoutSections: TemplateSection[] = [
  {
    id: "checkout.steps",
    page: "checkout",
    title: "Progress bar",
    description:
      "The cart, checkout and order complete steps at the top of those pages",
    groupIds: ["checkout.steps"],
    order: 0,
    hideable: false,
  },
  {
    id: "checkout.main",
    page: "checkout",
    title: "Checkout",
    description: "Contact, delivery and address form plus the order summary",
    groupIds: ["checkout.main"],
    order: 1,
    hideable: false,
  },
  {
    id: "checkout.unavailable",
    page: "checkout",
    title: "Checkout unavailable",
    description:
      "Message shown instead of the form when online payments are not set up",
    groupIds: ["checkout.unavailable"],
    order: 2,
    hideable: false,
  },
];
