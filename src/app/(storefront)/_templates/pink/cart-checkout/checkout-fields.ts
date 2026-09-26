import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Checkout page fields — design.md → "Per-page section concepts → Checkout".
 *
 * Two groups, both `page: "checkout"`:
 *  - `checkout.main` — the paper form column. Not hideable (it's the form).
 *  - `checkout.summary` — the sticky order summary aside. Hideable per design.md,
 *    though the checkout form always keeps a totals readout inline so the
 *    submit button is never orphaned from the price when an owner hides it.
 *
 * `cart`/`checkout` are intentionally absent from `PAGE_PREVIEW_PATHS`, so
 * these fields are edited in the platform-admin advanced editor only.
 */
export const pinkCheckoutData: TemplateField[] = [
  // ── checkout.main ──────────────────────────────────────────────────────
  {
    key: "pink.checkout.heading",
    label: "Heading",
    description: "The main heading at the top of the checkout page.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Checkout",
  },
  {
    key: "pink.checkout.intro",
    label: "Reassurance text",
    description:
      "One line under the heading explaining what happens next. Leave blank to hide.",
    type: "textarea",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-full",
    defaultValue:
      "No card is charged until the very last step. You'll see the full total before you pay.",
  },
  {
    key: "pink.checkout.contact-heading",
    label: "Contact heading",
    description: "Heading over the name / email / phone fields.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Who it's for",
  },
  {
    key: "pink.checkout.shipping-heading",
    label: "Shipping heading",
    description: "Heading over the delivery method and address fields.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Where it's going",
  },
  {
    key: "pink.checkout.submit-label",
    label: "Submit button text",
    description: "Text on the primary checkout submit button.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Continue to payment",
  },
  {
    key: "pink.checkout.back-link-label",
    label: "Back link text",
    description: "The quiet link beside the submit button, back to the basket.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Back to basket",
  },
  {
    key: "pink.checkout.note",
    label: "Payment note",
    description:
      "Small line explaining that no card is taken on this step, beside the submit button. Leave blank to hide.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-full",
    defaultValue: "No card is taken on this step.",
  },
  {
    key: "pink.checkout.empty-heading",
    label: "Empty basket heading",
    description: "Heading shown if checkout is reached with an empty basket.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Your basket is empty",
  },
  {
    key: "pink.checkout.empty-body",
    label: "Empty basket message",
    description:
      "Short line under the empty-basket heading. Leave blank to hide.",
    type: "textarea",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-full",
    defaultValue: "Add a piece before you check out.",
  },
  {
    key: "pink.checkout.empty-cta",
    label: "Empty basket button text",
    description:
      "Text on the button back to the shop on the empty-basket state. Leave blank to hide it.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Shop the collection",
  },

  // ── checkout.summary ───────────────────────────────────────────────────
  {
    key: "pink.checkout.summary-heading",
    label: "Heading",
    description: "Heading at the top of the sticky order summary panel.",
    type: "text",
    page: "checkout",
    group: "checkout.summary",
    gridColumn: "col-span-1",
    defaultValue: "Your basket",
  },
  {
    key: "pink.checkout.summary-discount-label",
    label: "Discount code label",
    description: "Label above the discount-code input in the summary panel.",
    type: "text",
    page: "checkout",
    group: "checkout.summary",
    gridColumn: "col-span-1",
    defaultValue: "Discount code",
  },
  {
    key: "pink.checkout.summary-apply-label",
    label: "Apply button text",
    description: "Text on the button that applies a discount code.",
    type: "text",
    page: "checkout",
    group: "checkout.summary",
    gridColumn: "col-span-1",
    defaultValue: "Apply",
  },
  {
    key: "pink.checkout.summary-note",
    label: "Closing note",
    description:
      "Small reassurance line at the bottom of the summary panel. Leave blank to hide.",
    type: "textarea",
    page: "checkout",
    group: "checkout.summary",
    gridColumn: "col-span-full",
    defaultValue: "Tax and the final total are confirmed on the next screen.",
  },
];

export const pinkCheckoutFieldGroups: TemplateFieldGroup[] = [
  {
    id: "checkout.main",
    title: "Checkout form",
    description:
      "Heading, section headings, submit button, and messaging for the checkout form",
    icon: "📝",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "checkout.summary",
    title: "Order summary",
    description:
      "Heading and copy for the sticky order summary beside the checkout form",
    icon: "🧾",
    columns: 2,
  } satisfies TemplateFieldGroup,
];
