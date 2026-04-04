import { z } from "zod";

const shippingAddressSchema = z.object({
  line1: z.string(),
  city: z.string(),
  state: z.string(),
  postal_code: z.string(),
  country: z.string(),
});

const orderItemSchema = z.object({
  productId: z.string().optional().nullable(),
  productName: z.string().optional().nullable(),
  productVariantId: z.string().optional().nullable(),
  quantity: z.coerce.number(),
  price: z.coerce.number(),
  total: z.coerce.number(),
});

export const manualOrderFormSchema = z.object({
  customerName: z.string(),
  customerEmail: z.string(),
  shippingName: z.string().optional(),
  shippingAddress: shippingAddressSchema.optional().nullable(),
  items: z.array(orderItemSchema),
  subtotal: z.coerce.number(),
  shipping: z.coerce.number(),
  tax: z.coerce.number(),
  total: z.coerce.number(),
  notes: z.string().optional().nullable(),
  status: z.string(),
  paymentStatus: z.string(),
  fulfillmentStatus: z.string(),
  sendConfirmationEmail: z.boolean(),
});

export const updateFulfillmentSchema = z.object({
  orderId: z.string(),
  fulfillmentStatus: z.string(),
  trackingNumber: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({
  orderId: z.string(),
  status: z.string(),
});

export const updatePaymentStatusSchema = z.object({
  orderId: z.string(),
  paymentStatus: z.string(),
});

export const refundOrderSchema = z.object({
  orderId: z.string(),
  amount: z.number(),
  reason: z.string().optional(),
});

export const orderFiltersSchema = z
  .object({
    status: z.string().optional(),
    search: z.string().optional(),
  })
  .optional();

export const markAsFulfilledSchema = z
  .object({
    orderId: z.string(),
    carrier: z.string().optional(),
    trackingNumber: z.string().optional(),
    trackingUrl: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const tn = data.trackingNumber?.trim();
    if (tn && !data.carrier?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Carrier is required when a tracking number is provided",
        path: ["carrier"],
      });
    }
  });

export const fulfillmentFormSchema = z
  .object({
    hasTracking: z.boolean(),
    carrier: z.string().optional(),
    trackingNumber: z.string().optional(),
    trackingUrl: z
      .string()
      .url("Invalid tracking URL")
      .optional()
      .or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (!data.hasTracking) return;
    if (!data.carrier?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Carrier is required",
        path: ["carrier"],
      });
    }
    if (!data.trackingNumber?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Tracking number is required",
        path: ["trackingNumber"],
      });
    }
  });

export type FulfillmentFormValues = z.infer<typeof fulfillmentFormSchema>;

export type ManualOrderFormSchema = z.infer<typeof manualOrderFormSchema>;
