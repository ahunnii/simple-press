import type {
  TemplateField,
  TemplateFieldGroup,
  TemplateListItemField,
} from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

/**
 * Purchase-path copy for the `dream` template: `/cart` (page "cart"),
 * `/checkout` and `/order/success` (page "checkout"). Cart and checkout
 * aren't previewable in `/editor` (the preview cart is always empty), so
 * owners edit these in the advanced template editor.
 *
 * The checkout-unavailable fields keep living in `./unavailable-fields.ts`
 * (keys unchanged); this module adds every other purchase-path group. The
 * orchestrator spreads `dreamCartCheckoutData` / `dreamCartCheckoutFieldGroups`
 * into the root `index.ts` and `dreamCartCheckoutSections` into
 * `sections.ts`. Components read through `resolveDreamCartCheckoutFields`
 * below, never the root `resolveFields`, so this module never imports the
 * root (no cycle). List parsing lives in `./dream-order-steps.ts` for the
 * same reason (`parseTemplateListRows` is a runtime import from
 * `~/lib/template-fields`, which aggregates every template's registry).
 */

// ─── Built-in "what happens next" rows (order confirmation) ─────────────────

/** Next steps after a shipped order. */
export const DREAM_ORDER_SHIP_STEPS_DEFAULT_ROWS: Record<string, string>[] = [
  {
    heading: "Check your inbox",
    body: "Your receipt and order details are on their way to your email.",
  },
  {
    heading: "We pack your order",
    body: "We'll email you again as soon as it ships.",
  },
  {
    heading: "It arrives",
    body: "Keep an eye on your email for delivery updates.",
  },
];

/** Next steps after an in-store pickup order. */
export const DREAM_ORDER_PICKUP_STEPS_DEFAULT_ROWS: Record<string, string>[] = [
  {
    heading: "Check your inbox",
    body: "Your receipt and order details are on their way to your email.",
  },
  {
    heading: "We get it ready",
    body: "We'll email you when your order is ready for pickup.",
  },
  {
    heading: "Pick it up",
    body: "Bring your confirmation email when you come by.",
  },
];

/** Next steps when the order's fulfilment method isn't known. */
export const DREAM_ORDER_STEPS_DEFAULT_ROWS: Record<string, string>[] = [
  {
    heading: "Check your inbox",
    body: "Your receipt and order details are on their way to your email.",
  },
  {
    heading: "We prepare your order",
    body: "We'll email you with updates as your order moves along.",
  },
];

const stepItemSchema: TemplateListItemField[] = [
  {
    key: "heading",
    label: "Step heading",
    type: "text",
    description: "A few words naming this step.",
    placeholder: "e.g. Check your inbox",
  },
  {
    key: "body",
    label: "Step text",
    type: "textarea",
    description: "One short sentence about what happens in this step.",
    placeholder: "One short sentence",
  },
];

// ─── cart.* ─────────────────────────────────────────────────────────────────

const cartData: TemplateField[] = [
  {
    key: "dream.cart.hero-heading",
    label: "Heading",
    description:
      "The cart page's main heading, shown before the highlighted word.",
    type: "text",
    page: "cart",
    group: "cart.hero",
    gridColumn: "col-span-1",
    defaultValue: "Your",
    placeholder: "A few words",
  },
  {
    key: "dream.cart.hero-accent",
    label: "Highlighted word",
    description:
      "One script-styled word after the heading. Never more than one word. Leave blank to hide.",
    type: "text",
    page: "cart",
    group: "cart.hero",
    gridColumn: "col-span-1",
    defaultValue: "cart",
    placeholder: "One word",
  },
  {
    key: "dream.cart.hero-lede",
    label: "Intro",
    description: "Short line under the cart heading. Leave blank to hide.",
    type: "textarea",
    page: "cart",
    group: "cart.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Check your pieces and quantities, then continue to checkout when you're ready.",
    placeholder: "One short sentence",
  },
  {
    key: "dream.cart.summary-heading",
    label: "Summary heading",
    description: "Heading above the totals panel beside the cart items.",
    type: "text",
    page: "cart",
    group: "cart.summary",
    gridColumn: "col-span-1",
    defaultValue: "Order summary",
    placeholder: "A few words",
  },
  {
    key: "dream.cart.checkout-label",
    label: "Checkout button label",
    description:
      "Label for the button that starts checkout. The button hides while checkout is turned off.",
    type: "text",
    page: "cart",
    group: "cart.summary",
    gridColumn: "col-span-1",
    defaultValue: "Continue to checkout",
    placeholder: "A short action",
  },
  {
    key: "dream.cart.summary-note",
    label: "Summary note",
    description: "Small note under the estimated total. Leave blank to hide.",
    type: "text",
    page: "cart",
    group: "cart.summary",
    gridColumn: "col-span-full",
    defaultValue: "Delivery, pickup, and taxes are confirmed at checkout.",
    placeholder: "One short sentence",
  },
  {
    key: "dream.cart.continue-label",
    label: "Keep shopping link",
    description:
      "Link back to the shop under the cart items. Leave blank to hide. Also hides while the shop is turned off.",
    type: "text",
    page: "cart",
    group: "cart.summary",
    gridColumn: "col-span-1",
    defaultValue: "Continue shopping",
    placeholder: "A short action",
  },
  {
    key: "dream.cart.empty-heading",
    label: "Empty cart heading",
    description: "Heading shown when the cart has nothing in it.",
    type: "text",
    page: "cart",
    group: "cart.empty",
    gridColumn: "col-span-full",
    defaultValue: "Your cart is empty",
    placeholder: "A short, warm line",
  },
  {
    key: "dream.cart.empty-body",
    label: "Empty cart message",
    description: "Line under the empty cart heading. Leave blank to hide.",
    type: "textarea",
    page: "cart",
    group: "cart.empty",
    gridColumn: "col-span-full",
    defaultValue:
      "Browse the shop for decor pieces and party details, then come back here to check out.",
    placeholder: "One or two short sentences",
  },
  {
    key: "dream.cart.empty-cta-label",
    label: "Empty cart button label",
    description:
      "Label for the button to the shop. Leave blank to hide. Also hides while the shop is turned off.",
    type: "text",
    page: "cart",
    group: "cart.empty",
    gridColumn: "col-span-1",
    defaultValue: "Browse the shop",
    placeholder: "A short action",
  },
];

// ─── checkout.hero / details / empty ───────────────────────────────────────

const checkoutData: TemplateField[] = [
  {
    key: "dream.checkout.hero-heading",
    label: "Heading",
    description:
      "The checkout page's main heading, shown before the highlighted word.",
    type: "text",
    page: "checkout",
    group: "checkout.hero",
    gridColumn: "col-span-1",
    defaultValue: "Complete your",
    placeholder: "A few words",
  },
  {
    key: "dream.checkout.hero-accent",
    label: "Highlighted word",
    description:
      "One script-styled word after the heading. Never more than one word. Leave blank to hide.",
    type: "text",
    page: "checkout",
    group: "checkout.hero",
    gridColumn: "col-span-1",
    defaultValue: "order",
    placeholder: "One word",
  },
  {
    key: "dream.checkout.hero-lede",
    label: "Intro",
    description: "Short line under the checkout heading. Leave blank to hide.",
    type: "textarea",
    page: "checkout",
    group: "checkout.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Tell us who's ordering and how it reaches you. You'll pay on the secure payment page next.",
    placeholder: "One or two short sentences",
  },
  {
    key: "dream.checkout.contact-heading",
    label: "Contact heading",
    description: "Heading above the name, email, and phone fields.",
    type: "text",
    page: "checkout",
    group: "checkout.details",
    gridColumn: "col-span-1",
    defaultValue: "Your details",
    placeholder: "A few words",
  },
  {
    key: "dream.checkout.delivery-heading",
    label: "Delivery choice heading",
    description:
      "Heading above the ship or pick up choice. Only shown when in-store pickup is on.",
    type: "text",
    page: "checkout",
    group: "checkout.details",
    gridColumn: "col-span-1",
    defaultValue: "Delivery or pickup",
    placeholder: "A few words",
  },
  {
    key: "dream.checkout.ship-body",
    label: "Shipping choice note",
    description:
      "Line under the delivery choice while shipping is selected. Leave blank to hide.",
    type: "text",
    page: "checkout",
    group: "checkout.details",
    gridColumn: "col-span-full",
    defaultValue: "Shipping is added from your address before you pay.",
    placeholder: "One short sentence",
  },
  {
    key: "dream.checkout.pickup-body",
    label: "Pickup choice note",
    description:
      "Line under the delivery choice while pickup is selected. Your pickup location and instructions from Settings show below it. Leave blank to hide.",
    type: "text",
    page: "checkout",
    group: "checkout.details",
    gridColumn: "col-span-full",
    defaultValue:
      "No shipping charge. We'll email you when your order is ready to collect.",
    placeholder: "One short sentence",
  },
  {
    key: "dream.checkout.address-heading",
    label: "Address heading",
    description: "Heading above the shipping address fields.",
    type: "text",
    page: "checkout",
    group: "checkout.details",
    gridColumn: "col-span-1",
    defaultValue: "Where it ships",
    placeholder: "A few words",
  },
  {
    key: "dream.checkout.address-note",
    label: "Address note",
    description: "Line under the address heading. Leave blank to hide.",
    type: "text",
    page: "checkout",
    group: "checkout.details",
    gridColumn: "col-span-full",
    defaultValue:
      "We use this address to price delivery. You can confirm it on the secure payment page.",
    placeholder: "One short sentence",
  },
  {
    key: "dream.checkout.summary-heading",
    label: "Summary heading",
    description: "Heading above the order summary beside the form.",
    type: "text",
    page: "checkout",
    group: "checkout.details",
    gridColumn: "col-span-1",
    defaultValue: "Your order",
    placeholder: "A few words",
  },
  {
    key: "dream.checkout.submit-label",
    label: "Payment button label",
    description:
      "Label for the button that continues to the secure payment page.",
    type: "text",
    page: "checkout",
    group: "checkout.details",
    gridColumn: "col-span-1",
    defaultValue: "Continue to payment",
    placeholder: "A short action",
  },
  {
    key: "dream.checkout.tax-note",
    label: "Tax note",
    description:
      "Small note under the estimated total saying when tax is added. Always shown; a blank value uses the built-in line.",
    type: "text",
    page: "checkout",
    group: "checkout.details",
    gridColumn: "col-span-full",
    defaultValue:
      "Taxes and the final total are confirmed on the secure payment page.",
    placeholder: "One short sentence",
  },
  {
    key: "dream.checkout.empty-heading",
    label: "Empty checkout heading",
    description: "Heading shown on the checkout page when the cart is empty.",
    type: "text",
    page: "checkout",
    group: "checkout.empty",
    gridColumn: "col-span-full",
    defaultValue: "Nothing to check out yet",
    placeholder: "A short, warm line",
  },
  {
    key: "dream.checkout.empty-body",
    label: "Empty checkout message",
    description: "Line under the empty checkout heading. Leave blank to hide.",
    type: "textarea",
    page: "checkout",
    group: "checkout.empty",
    gridColumn: "col-span-full",
    defaultValue:
      "Your cart is empty. Add a piece from the shop, then come back to check out.",
    placeholder: "One or two short sentences",
  },
  {
    key: "dream.checkout.empty-cta-label",
    label: "Empty checkout button label",
    description:
      "Label for the button to the shop. Leave blank to hide. Also hides while the shop is turned off.",
    type: "text",
    page: "checkout",
    group: "checkout.empty",
    gridColumn: "col-span-1",
    defaultValue: "Browse the shop",
    placeholder: "A short action",
  },
];

// ─── checkout.confirmation / no-order (/order/success) ─────────────────────

const orderData: TemplateField[] = [
  {
    key: "dream.checkout.confirmation-heading",
    label: "Heading",
    description:
      "Main heading on the order confirmation page, shown before the highlighted word.",
    type: "text",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-1",
    defaultValue: "Thank you for your",
    placeholder: "A few words",
  },
  {
    key: "dream.checkout.confirmation-accent",
    label: "Highlighted word",
    description:
      "One script-styled word after the heading. Never more than one word. Leave blank to hide.",
    type: "text",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-1",
    defaultValue: "order",
    placeholder: "One word",
  },
  {
    key: "dream.checkout.confirmation-lede",
    label: "Intro",
    description:
      "Short line under the confirmation heading. Leave blank to hide.",
    type: "textarea",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-full",
    defaultValue:
      "Your payment went through, and a receipt is on its way to your inbox.",
    placeholder: "One short sentence",
  },
  {
    key: "dream.checkout.confirmation-next-heading",
    label: "Next steps heading",
    description: "Heading above the numbered next steps.",
    type: "text",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-1",
    defaultValue: "What happens next",
    placeholder: "A few words",
  },
  {
    key: "dream.checkout.confirmation-receipt-heading",
    label: "Order details heading",
    description:
      "Heading on the panel showing the order total and the email the receipt went to.",
    type: "text",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-1",
    defaultValue: "Order details",
    placeholder: "A few words",
  },
  {
    key: "dream.checkout.confirmation-ship-steps",
    label: "Next steps for shipped orders",
    description:
      "Up to 4 numbered steps shown when the order ships. Leave empty to use the built-in steps.",
    type: "list",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-full",
    maxItems: 4,
    defaultsWhenEmpty: true,
    itemLabel: "step",
    summaryKey: "heading",
    itemSchema: stepItemSchema,
    defaultRows: DREAM_ORDER_SHIP_STEPS_DEFAULT_ROWS,
  },
  {
    key: "dream.checkout.confirmation-pickup-steps",
    label: "Next steps for pickup orders",
    description:
      "Up to 4 numbered steps shown when the order is picked up in store. Leave empty to use the built-in steps.",
    type: "list",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-full",
    maxItems: 4,
    defaultsWhenEmpty: true,
    itemLabel: "step",
    summaryKey: "heading",
    itemSchema: stepItemSchema,
    defaultRows: DREAM_ORDER_PICKUP_STEPS_DEFAULT_ROWS,
  },
  {
    key: "dream.checkout.confirmation-steps",
    label: "Next steps when the method is unknown",
    description:
      "Up to 4 numbered steps shown when the order details can't be loaded. Leave empty to use the built-in steps.",
    type: "list",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-full",
    maxItems: 4,
    defaultsWhenEmpty: true,
    itemLabel: "step",
    summaryKey: "heading",
    itemSchema: stepItemSchema,
    defaultRows: DREAM_ORDER_STEPS_DEFAULT_ROWS,
  },
  {
    key: "dream.checkout.confirmation-orders-label",
    label: "Orders button label",
    description:
      "Button to the shopper's order history, shown to signed-in shoppers while Orders is on. A blank value uses the built-in label.",
    type: "text",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-1",
    defaultValue: "View my orders",
    placeholder: "A short action",
  },
  {
    key: "dream.checkout.confirmation-signup-label",
    label: "Create account button label",
    description:
      "Button to sign up, shown to signed-out shoppers while customer accounts are on. A blank value uses the built-in label.",
    type: "text",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-1",
    defaultValue: "Create an account",
    placeholder: "A short action",
  },
  {
    key: "dream.checkout.confirmation-continue-label",
    label: "Keep shopping button label",
    description:
      "Button back to the shop, on this page and the order-not-found page. Leave blank to hide. Also hides while the shop is turned off.",
    type: "text",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-1",
    defaultValue: "Continue shopping",
    placeholder: "A short action",
  },
  {
    key: "dream.checkout.confirmation-home-label",
    label: "Home link label",
    description:
      "Link back to the homepage, on this page and the order-not-found page. Leave blank to hide.",
    type: "text",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-1",
    defaultValue: "Back to home",
    placeholder: "A short action",
  },
  {
    key: "dream.checkout.no-order-heading",
    label: "Heading",
    description:
      "Heading shown when the order page is opened without an order, before the highlighted word.",
    type: "text",
    page: "checkout",
    group: "checkout.no-order",
    gridColumn: "col-span-1",
    defaultValue: "We couldn't find that",
    placeholder: "A few words",
  },
  {
    key: "dream.checkout.no-order-accent",
    label: "Highlighted word",
    description:
      "One script-styled word after the heading. Never more than one word. Leave blank to hide.",
    type: "text",
    page: "checkout",
    group: "checkout.no-order",
    gridColumn: "col-span-1",
    defaultValue: "order",
    placeholder: "One word",
  },
  {
    key: "dream.checkout.no-order-lede",
    label: "Message",
    description: "Line under the order-not-found heading. Leave blank to hide.",
    type: "textarea",
    page: "checkout",
    group: "checkout.no-order",
    gridColumn: "col-span-full",
    defaultValue:
      "This page shows your order right after checkout. If you just paid, your receipt email has every detail.",
    placeholder: "One or two short sentences",
  },
];

export const dreamCartCheckoutData: TemplateField[] = [
  ...cartData,
  ...checkoutData,
  ...orderData,
];

export const dreamCartCheckoutFieldGroups: TemplateFieldGroup[] = [
  {
    id: "cart.hero",
    title: "Page header",
    description: "Cart page heading, highlighted word, and intro.",
    icon: "☁️",
    columns: 2,
  },
  {
    id: "cart.summary",
    title: "Order summary",
    description:
      "Totals panel beside the cart items: heading, note, checkout button, and the keep-shopping link.",
    icon: "🧾",
    columns: 2,
  },
  {
    id: "cart.empty",
    title: "Empty cart",
    description: "Heading, message, and button shown when the cart is empty.",
    icon: "🛒",
    columns: 2,
  },
  {
    id: "checkout.hero",
    title: "Page header",
    description: "Checkout page heading, highlighted word, and intro.",
    icon: "☁️",
    columns: 2,
  },
  {
    id: "checkout.details",
    title: "Checkout form",
    description:
      "Headings and notes on the checkout form, the payment button, and the tax note.",
    icon: "📝",
    columns: 2,
  },
  {
    id: "checkout.empty",
    title: "Empty checkout",
    description:
      "Heading, message, and button shown on checkout when the cart is empty.",
    icon: "🛒",
    columns: 2,
  },
  {
    id: "checkout.confirmation",
    title: "Order confirmation",
    description:
      "The thank-you page after payment: heading, next steps for shipped and pickup orders, and its buttons.",
    icon: "🎉",
    columns: 2,
  },
  {
    id: "checkout.no-order",
    title: "Order not found",
    description:
      "Shown when the order confirmation page is opened without an order.",
    icon: "🔎",
    columns: 2,
  },
];

export const dreamCartCheckoutSections: TemplateSection[] = [
  {
    id: "cart.hero",
    page: "cart",
    title: "Page header",
    description: "Heading, intro, and logo over the sky background.",
    groupIds: ["cart.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "cart.summary",
    page: "cart",
    title: "Order summary",
    description: "Totals panel and checkout button beside the cart items.",
    groupIds: ["cart.summary"],
    order: 1,
    hideable: false,
  },
  {
    id: "cart.empty",
    page: "cart",
    title: "Empty cart",
    description: "Shown in place of the items when the cart is empty.",
    groupIds: ["cart.empty"],
    order: 2,
    hideable: false,
  },
  {
    id: "checkout.hero",
    page: "checkout",
    title: "Page header",
    description: "Heading, intro, and logo over the sky background.",
    groupIds: ["checkout.hero"],
    order: 0,
    hideable: false,
  },
  // order 1 = `checkout.unavailable` (./unavailable-fields.ts)
  {
    id: "checkout.details",
    page: "checkout",
    title: "Checkout form",
    description:
      "Contact, delivery, and address fields beside the order summary and payment button.",
    groupIds: ["checkout.details"],
    order: 2,
    hideable: false,
  },
  {
    id: "checkout.empty",
    page: "checkout",
    title: "Empty checkout",
    description: "Shown in place of the form when the cart is empty.",
    groupIds: ["checkout.empty"],
    order: 3,
    hideable: false,
  },
  {
    id: "checkout.confirmation",
    page: "checkout",
    title: "Order confirmation",
    description: "The thank-you page shoppers land on after paying.",
    groupIds: ["checkout.confirmation"],
    order: 4,
    hideable: false,
  },
  {
    id: "checkout.no-order",
    page: "checkout",
    title: "Order not found",
    description: "Shown when the order confirmation page has no order to show.",
    groupIds: ["checkout.no-order"],
    order: 5,
    hideable: false,
  },
];

const _fieldMap = new Map(
  dreamCartCheckoutData.map((field) => [field.key, field]),
);

export function resolveDreamCartCheckoutFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _fieldMap);
}

/**
 * Like `resolveDreamCartCheckoutFields`, but a saved-blank value falls back
 * to the field's built-in default instead of hiding — for the few strings a
 * purchase step can't do without (the checkout and payment buttons, the
 * tax note, headings).
 */
export function resolveDreamCartCheckoutRequired(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  const resolved = resolveTemplateFields(customFields, keys, _fieldMap);
  const out: Record<string, string> = {};
  for (const key of keys) {
    const value = (resolved[key] ?? "").trim();
    out[key] = value || (_fieldMap.get(key)?.defaultValue ?? "");
  }
  return out;
}
