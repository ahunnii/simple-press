import { z } from "zod";

export const discountFormSchema = z.object({
  code: z.string(),
  type: z.enum(["percentage", "fixed", "free_shipping"]),
  value: z.coerce.number().min(0, "Value can't be negative"),
  active: z.boolean(),
  usageLimit: z.coerce.number().optional().nullable(),
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
