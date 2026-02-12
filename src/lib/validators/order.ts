import { z } from "zod";

export const manualOrderFormSchema = z.object({
  customerName: z.string(),
  customerEmail: z.string(),
  shippingName: z.string(),
  shippingAddress: z.object({
    line1: z.string(),
    city: z.string(),
    state: z.string(),
    postal_code: z.string(),
    country: z.string(),
  }),
  items: z.array(
    z.object({
      productId: z.string(),
      productName: z.string(),
      productVariantId: z.string(),
      quantity: z.coerce.number(),
      price: z.coerce.number(),
      total: z.coerce.number(),
    }),
  ),
  subtotal: z.coerce.number(),
  shipping: z.coerce.number(),
  tax: z.coerce.number(),
  total: z.coerce.number(),
  notes: z.string().optional(),
});

export type ManualOrderFormSchema = z.infer<typeof manualOrderFormSchema>;
