import { z } from "zod";

export const discountFormSchema = z.object({
  code: z.string(),
  type: z.enum(["percentage", "fixed"]),
  value: z.coerce.number().min(0),
  active: z.boolean(),
  usageLimit: z.coerce.number().optional().nullable(),
  expiresAt: z.date().nullable().optional(),
  minPurchase: z.coerce.number().nonnegative().optional().nullable(),
  maxDiscount: z.coerce.number().nonnegative().optional().nullable(),
});

export type DiscountFormSchema = z.infer<typeof discountFormSchema>;
