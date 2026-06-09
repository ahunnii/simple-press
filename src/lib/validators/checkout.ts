import { z } from "zod";

const checkoutShippingAddressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional().nullable(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().min(1),
  phone: z.string().optional().nullable(),
});

const checkoutItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().nullable(),
  productName: z.string(),
  variantName: z.string().nullable(),
  price: z.number().nonnegative(),
  quantity: z.number().int().min(1).max(100),
  imageUrl: z.string().nullable(),
  sku: z.string().optional(),
});

const checkoutCustomerInfoSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  phone: z.string().optional().nullable(),
  shippingAddress: checkoutShippingAddressSchema.optional().nullable(),
});

export const checkoutSessionSchema = z.object({
  items: z.array(checkoutItemSchema).min(1),
  customerInfo: checkoutCustomerInfoSchema,
  discountCodeId: z.string().optional().nullable(),
  deliveryMethod: z.enum(["ship", "pickup"]).optional(),
});

export type CheckoutSessionInput = z.infer<typeof checkoutSessionSchema>;
