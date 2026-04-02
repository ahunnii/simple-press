import { z } from "zod";

const productFeatureSchema = z.object({
  icon: z.string(),
  text: z.string(),
});

const additionalFieldsSchema = z
  .object({
    additionalInformation: z.record(z.string(), z.unknown()).optional(),
    productFeatures: z.array(productFeatureSchema).optional(),
    // comingSoon: z.boolean().optional().nullable(),
  })
  .optional();

export const productCreateSchema = z.object({
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  price: z.number(),
  published: z.boolean(),
  trackInventory: z.boolean(),
  allowBackorders: z.boolean().default(false),
  inventoryQty: z.number().optional(),
  variants: z.array(
    z.object({
      name: z.string(),
      sku: z.string().optional(),
      price: z.number(),
      inventoryQty: z.number(),
      options: z.record(z.string(), z.string()),
    }),
  ),
  additionalFields: additionalFieldsSchema,
});

export const productUpdateSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  price: z.number(),
  published: z.boolean(),
  trackInventory: z.boolean(),
  allowBackorders: z.boolean().default(false),
  inventoryQty: z.number().optional(),
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
  additionalFields: additionalFieldsSchema,
});

export const productFormSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  price: z.number(),
  published: z.boolean(),
  trackInventory: z.boolean(),
  allowBackorders: z.boolean(),
  inventoryQty: z.number().optional(),
  variants: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string(),
        sku: z.string().optional(),
        price: z.number(),
        inventoryQty: z.number(),
        options: z.record(z.string(), z.string()),
      }),
    )
    .optional(),
  images: z
    .array(
      z.object({
        id: z.string().optional(),
        url: z.string(),
        altText: z.string().optional(),
        sortOrder: z.number(),
      }),
    )
    .optional(),
  additionalFields: additionalFieldsSchema,
});

export type ProductFormSchema = z.infer<typeof productFormSchema>;
