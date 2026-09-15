import { z } from "zod";

const checkoutShippingAddressSchema = z.object({
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional().nullable(),
  city: z.string().min(1).max(120),
  state: z.string().min(1).max(120),
  postalCode: z.string().min(1).max(120),
  country: z.string().min(1).max(120),
  phone: z.string().max(40).optional().nullable(),
});

const checkoutItemSchema = z.object({
  productId: z.string().min(1).max(64),
  variantId: z.string().max(64).nullable(),
  // Product/variant names are capped at 255 in ~/lib/validators/product.ts —
  // 500 here is never lower than what the product schema allows.
  productName: z.string().max(500),
  variantName: z.string().max(500).nullable(),
  price: z.number().nonnegative(),
  quantity: z.number().int().min(1).max(100),
  imageUrl: z.string().max(2048).nullable(),
  sku: z.string().max(120).nullable().optional(),
});

const checkoutCustomerInfoSchema = z.object({
  email: z.string().email().max(320),
  name: z.string().max(200),
  phone: z.string().max(40).optional().nullable(),
  shippingAddress: checkoutShippingAddressSchema.optional().nullable(),
});

export const checkoutSessionSchema = z.object({
  // Matches the cap on `shipping.quote` in
  // ~/server/api/routers/shipping.ts.
  items: z.array(checkoutItemSchema).min(1).max(200),
  customerInfo: checkoutCustomerInfoSchema,
  discountCodeId: z.string().max(64).optional().nullable(),
  deliveryMethod: z.enum(["ship", "pickup"]).optional(),
});

export type CheckoutSessionInput = z.infer<typeof checkoutSessionSchema>;
