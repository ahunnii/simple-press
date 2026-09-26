import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Cart, checkout-unavailable, and order-confirmation fields for `noise`.
 *
 * Shipping / returns / packing promises are deliberately NOT built in: every
 * store ships on its own terms, so the checkout notes list and the
 * after-purchase note both default to empty (hidden). The old hardcoded claims
 * ("Ships within five working days", "14-day exchange policy", free gift wrap,
 * PayPal in the payment pills, …) were removed 2026-09-25 — see
 * `docs/templates/noise/build-state.md` → "Backfill candidates".
 */

// ─── Global: Cart ─────────────────────────────────────────────────────────────
// Drives the slide-out cart panel (`noise-cart-drawer.tsx`), the cart page
// (`noise-cart-contents.tsx` / `noise-cart-summary.tsx`), and the empty /
// notes blocks on the checkout form (`noise-checkout-form.tsx`).

export const CART_NOTES_KEY = "noise.global.cart-reassurance";

const globalCartData: TemplateField[] = [
  {
    key: "noise.global.cart-label",
    label: "Cart label",
    description:
      "Small label at the top of the cart panel and above the cart page heading. Leave blank to hide.",
    type: "text",
    page: "global",
    group: "global.cart",
    gridColumn: "col-span-1",
    defaultValue: "Your Bag",
    placeholder: "e.g. Your Cart",
  },
  {
    key: "noise.global.cart-empty-heading",
    label: "Empty cart heading",
    description:
      "Heading shown in the cart panel and on the cart page when the cart is empty.",
    type: "text",
    page: "global",
    group: "global.cart",
    gridColumn: "col-span-1",
    defaultValue: "Your bag is empty.",
  },
  {
    key: "noise.global.cart-empty-body",
    label: "Empty cart message",
    description: "Line below the empty cart heading. Leave blank to hide.",
    type: "text",
    page: "global",
    group: "global.cart",
    gridColumn: "col-span-full",
    defaultValue: "Anything you add will appear here.",
  },
  {
    key: "noise.global.cart-empty-button-text",
    label: "Empty cart button text",
    description:
      "Button shown when the cart is empty — in the cart panel, on the cart page, on the checkout page, and on a customer's empty order history. Leave blank to hide.",
    type: "text",
    page: "global",
    group: "global.cart",
    gridColumn: "col-span-1",
    defaultValue: "Shop the Collection",
  },
  {
    key: "noise.global.cart-empty-button-link",
    label: "Empty cart button link",
    description:
      "Where the empty cart button sends shoppers — also used by the empty order history button.",
    type: "url",
    page: "global",
    group: "global.cart",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
  },
  {
    key: CART_NOTES_KEY,
    label: "Checkout notes",
    description:
      "Up to four short notes listed under the checkout button on the cart page and on the checkout page — only promises that hold for every order, like how fast you ship or your exchange window. Leave empty to hide.",
    type: "list",
    page: "global",
    group: "global.cart",
    gridColumn: "col-span-full",
    itemLabel: "note",
    minItems: 0,
    maxItems: 4,
    itemSchema: [
      {
        key: "text",
        label: "Text",
        type: "text",
        description: "One short line. Rows left blank are skipped.",
        placeholder: "e.g. Ships within 3 business days",
      },
    ],
  },
];

// ─── Checkout: Unavailable ────────────────────────────────────────────────────
// `checkout/page.tsx` renders `<t.CheckoutUnavailable />` with NO props when
// the store hasn't connected Stripe, so `NoiseCheckoutUnavailable`
// self-fetches the business to resolve these — see that component.

const checkoutUnavailableData: TemplateField[] = [
  {
    key: "noise.checkout.unavailable-heading",
    label: "Heading",
    description:
      "Heading shown on the checkout page when the store hasn't set up online payments yet.",
    type: "text",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-1",
    defaultValue: "Checkout unavailable.",
  },
  {
    key: "noise.checkout.unavailable-body",
    label: "Body text",
    description: "Message shown below the heading. Leave blank to hide.",
    type: "textarea",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-full",
    defaultValue:
      "This store isn't taking online payments yet. Please check back soon or get in touch.",
  },
  {
    key: "noise.checkout.unavailable-cta",
    label: "Button text",
    description:
      "Label on the button back to the shop. Leave blank to hide the button.",
    type: "text",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-1",
    defaultValue: "Back to shop",
  },
];

// ─── Checkout: Order confirmation ─────────────────────────────────────────────

const checkoutSuccessData: TemplateField[] = [
  {
    key: "noise.checkout.success-note",
    label: "Note after purchase",
    description:
      "Optional message on the order confirmation page, such as when orders ship or how pickup works. Leave blank to hide.",
    type: "textarea",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "e.g. Orders usually ship within 3 business days.",
  },
];

export const noiseCartCheckoutData: TemplateField[] = [
  ...globalCartData,
  ...checkoutUnavailableData,
  ...checkoutSuccessData,
];

// ─── Field Groups ─────────────────────────────────────────────────────────────

export const noiseCartCheckoutFieldGroups: TemplateFieldGroup[] = [
  {
    id: "global.cart",
    title: "Cart",
    description:
      "Wording in the cart panel and on the cart page, plus the notes shown under the checkout button.",
    icon: "🛍️",
    columns: 2,
  },
  {
    id: "checkout.unavailable",
    title: "Checkout unavailable",
    description:
      "Shown on the checkout page when online payments aren't set up yet.",
    icon: "⏸️",
    columns: 2,
  },
  {
    id: "checkout.success",
    title: "Order confirmation",
    description:
      "Page shoppers see right after paying. Pickup details come from Settings.",
    icon: "✅",
    columns: 1,
  },
];
