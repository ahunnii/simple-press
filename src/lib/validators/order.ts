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

export const shipmentInputSchema = z.object({
  carrier: z.string().optional(),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().optional(),
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
  paymentMethod: z.string().optional(),
  fulfillmentStatus: z.string(),
  sendConfirmationEmail: z.boolean(),
});

export const updateFulfillmentSchema = z.object({
  orderId: z.string(),
  fulfillmentStatus: z.string(),
});

export const updateOrderStatusSchema = z.object({
  orderId: z.string(),
  status: z.string(),
  restockItems: z.boolean().default(false),
  sendEmail: z.boolean().default(false),
});

export const updatePaymentStatusSchema = z.object({
  orderId: z.string(),
  paymentStatus: z.string(),
});

export const refundOrderSchema = z.object({
  orderId: z.string(),
  amount: z.number(),
  reason: z.string().optional(),
  restockItems: z.boolean().default(false),
  sendEmail: z.boolean().default(true),
});

export const markAsRefundedSchema = z.object({
  orderId: z.string(),
  reason: z.string().optional(),
  restockItems: z.boolean().default(false),
  sendEmail: z.boolean().default(true),
});

export const orderFiltersSchema = z
  .object({
    status: z.string().optional(),
    search: z.string().optional(),
  })
  .optional();

export const markAsFulfilledSchema = z.object({
  orderId: z.string(),
  shipments: z.array(shipmentInputSchema).min(1),
});

export const addShipmentSchema = z.object({
  orderId: z.string(),
  carrier: z.string().optional(),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().optional(),
});

export const updateShipmentSchema = z.object({
  shipmentId: z.string(),
  carrier: z.string().optional(),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().optional(),
});

export const updateShippingAddressSchema = z.object({
  orderId: z.string(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  company: z.string().optional().nullable(),
  address1: z.string().min(1),
  address2: z.string().optional().nullable(),
  city: z.string().min(1),
  province: z.string().optional().nullable(),
  zip: z.string().min(1),
  country: z.string().min(1),
  phone: z.string().optional().nullable(),
});

export const fulfillmentFormSchema = z
  .object({
    hasTracking: z.boolean(),
    packages: z.array(
      z.object({
        carrier: z.string().optional(),
        trackingNumber: z.string().optional(),
        trackingUrl: z
          .string()
          .url("Invalid tracking URL")
          .optional()
          .or(z.literal("")),
      }),
    ),
  })
  .superRefine((data, ctx) => {
    if (!data.hasTracking) return;
    data.packages.forEach((pkg, i) => {
      if (!pkg.carrier?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Carrier is required",
          path: ["packages", i, "carrier"],
        });
      }
      if (!pkg.trackingNumber?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Tracking number is required",
          path: ["packages", i, "trackingNumber"],
        });
      }
    });
  });

export type FulfillmentFormValues = z.infer<typeof fulfillmentFormSchema>;
export type ShipmentInput = z.infer<typeof shipmentInputSchema>;
export type ManualOrderFormSchema = z.infer<typeof manualOrderFormSchema>;
export type MarkAsRefundedSchema = z.infer<typeof markAsRefundedSchema>;
