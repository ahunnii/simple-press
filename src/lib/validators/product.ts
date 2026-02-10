import { z } from "zod";

export const productCreateSchema = z.object({
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  price: z.number(),
  published: z.boolean(),
  variants: z.array(
    z.object({
      name: z.string(),
      sku: z.string().optional(),
      price: z.number(),
      inventoryQty: z.number(),
      options: z.record(z.string(), z.string()),
    }),
  ),
});

export const productUpdateSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  price: z.number(),
  published: z.boolean(),
  variants: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string(),
      sku: z.string().optional(),
      price: z.number(),
      inventoryQty: z.number(),
      options: z.record(z.string(), z.string()),
    }),
  ),
});
