import { z } from "zod";

import type { SubscriptionIntervalKey } from "~/lib/subscriptions/intervals";
import { SUBSCRIPTION_INTERVAL_KEYS } from "~/lib/subscriptions/intervals";

/** Zod schema for a single subscription cadence key — derives the enum from the intervals catalog, so there is one source of truth. */
export const subscriptionIntervalKeySchema = z.enum(
  SUBSCRIPTION_INTERVAL_KEYS as [
    SubscriptionIntervalKey,
    ...SubscriptionIntervalKey[],
  ],
);

/**
 * Owner-editable subscription fields on the product form
 * (`Product.subscriptionEnabled`/`subscriptionIntervals`/`subscriptionDiscountPercent`).
 * Plain-object schema (no cross-field refine) so it can be spread/extended
 * like the other `*FieldsSchema` exports in `validators/product.ts`; the
 * router enforces "enabled ⇒ at least one interval" itself.
 */
export const productSubscriptionFieldsSchema = z.object({
  subscriptionEnabled: z.boolean().default(false),
  subscriptionIntervals: z
    .array(subscriptionIntervalKeySchema)
    .max(SUBSCRIPTION_INTERVAL_KEYS.length)
    .default([]),
  subscriptionDiscountPercent: z.coerce
    .number()
    .int()
    .min(0)
    .max(90)
    .default(0),
});

export type ProductSubscriptionFields = z.infer<
  typeof productSubscriptionFieldsSchema
>;

// Mirrors `checkoutShippingAddressSchema` in `src/lib/validators/checkout.ts`
// field-for-field. That schema is a private (non-exported) const there, so
// it's redefined here rather than imported — see the note on
// `subscriptionCheckoutBodySchema` below. Keep this in sync if checkout.ts's
// address shape ever changes.
const subscriptionShippingAddressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional().nullable(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().min(1),
  phone: z.string().optional().nullable(),
});

// Note: `email` intentionally matches checkout.ts's `checkoutCustomerInfoSchema`
// exactly — a bare `z.string().email()`, no `.trim()`/`.toLowerCase()` — so
// the one-time and subscription checkout paths behave identically for a
// padded/mixed-case address. `name` differs: checkout.ts uses a bare
// `z.string()` (no minimum length) but the Subscribe flow has no cart-side
// pre-validation to lean on, so this schema requires a non-empty name itself.
const subscriptionCustomerInfoSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  shippingAddress: subscriptionShippingAddressSchema.optional().nullable(),
});

/**
 * Body of `POST /api/stripe/subscriptions/create-session`. Only ids,
 * cadence, quantity, delivery method, and customer-supplied contact/address
 * info come from the client — price, discount, shipping, and Stripe
 * parameters are always server-derived (see the plan's security invariants).
 */
export const subscriptionCheckoutBodySchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional().nullable(),
  intervalKey: subscriptionIntervalKeySchema,
  quantity: z.number().int().min(1).max(50),
  deliveryMethod: z.enum(["ship", "pickup"]),
  customerInfo: subscriptionCustomerInfoSchema,
});

export type SubscriptionCheckoutBody = z.infer<
  typeof subscriptionCheckoutBodySchema
>;

/** The `/subscriptions/[token]` manage-page and `*ByToken` procedure input. */
export const manageTokenSchema = z.object({
  token: z.string().min(1),
});

/** `subscription.requestManageLinks` input — looks up manage links by email. */
export const lookupEmailSchema = z.object({
  email: z.string().email(),
});

/**
 * Status filter options for the admin subscriptions list, `"all"` plus every
 * `Subscription.status` value — in the order the filter UI renders them.
 */
export const SUBSCRIPTION_STATUS_FILTER_VALUES = [
  "all",
  "active",
  "past_due",
  "paused",
  "cancelled",
  "incomplete",
] as const;

export type SubscriptionStatusFilterValue =
  (typeof SUBSCRIPTION_STATUS_FILTER_VALUES)[number];

/** Human-readable labels for every real status (excludes the `"all"` filter pseudo-value). */
export const SUBSCRIPTION_STATUS_LABELS: Record<
  Exclude<SubscriptionStatusFilterValue, "all">,
  string
> = {
  active: "Active",
  past_due: "Past due",
  paused: "Paused",
  cancelled: "Cancelled",
  incomplete: "Incomplete",
};
