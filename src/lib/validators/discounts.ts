import { z } from "zod";

// NOTE: this schema is used both by the client form (discount-form.tsx) and,
// via `discountFormSchema.extend({ id })`, by the server router
// (src/server/api/routers/discount.ts). It must stay a plain ZodObject —
// wrapping it in `.refine()`/`.superRefine()` would turn it into a
// ZodEffects, which does not support `.extend()` and would break the
// router's update procedure. Cross-field checks (e.g. startsAt < expiresAt)
// therefore can't live on this exact export without also touching the
// router; see `validateDiscountDateRange` below for a reusable check that
// can be applied wherever the date pair is available.
export const discountFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .max(50, "Code must be at most 50 characters"),
  type: z.enum(["percentage", "fixed", "free_shipping"]),
  value: z.coerce.number().min(0, "Value can't be negative"),
  active: z.boolean(),
  usageLimit: z.coerce
    .number()
    .int("Usage limit must be a whole number")
    .nonnegative("Usage limit can't be negative")
    .max(1_000_000, "Usage limit must be at most 1,000,000")
    .optional()
    .nullable(),
  perCustomerLimit: z.coerce
    .number()
    .int("Per-customer limit must be a whole number")
    .min(1, "Per-customer limit must be at least 1")
    .optional()
    .nullable(),
  startsAt: z.date().nullable().optional(),
  expiresAt: z.date().nullable().optional(),
  minPurchase: z.coerce
    .number()
    .nonnegative("Minimum purchase can't be negative")
    .optional()
    .nullable(),
  maxDiscount: z.coerce
    .number()
    .nonnegative("Maximum discount can't be negative")
    .optional()
    .nullable(),
});

export type DiscountFormSchema = z.infer<typeof discountFormSchema>;

/**
 * Cross-field check: when both dates are set, the start date must precede
 * the expiration date. Not baked into `discountFormSchema` itself (see note
 * above) — call this from wherever both fields are validated together.
 */
export function validateDiscountDateRange(data: {
  startsAt?: Date | null;
  expiresAt?: Date | null;
}): boolean {
  if (!data.startsAt || !data.expiresAt) return true;
  return data.startsAt < data.expiresAt;
}

export const DISCOUNT_DATE_RANGE_ERROR =
  "Start date must be before the expiration date";
