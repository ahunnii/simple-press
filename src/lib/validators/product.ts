import { z } from "zod";

const productFeatureSchema = z.object({
  icon: z.string(),
  text: z.string(),
});

const additionalFieldsSchema = z
  .object({
    additionalInformation: z.record(z.string(), z.unknown()).optional(),
    productFeatures: z.array(productFeatureSchema).optional(),
    comingSoon: z.boolean().optional().nullable(),
    productTagline: z.string().optional().nullable(),
  })
  .optional();

export const productImageSchema = z.object({
  id: z.string().optional(),
  url: z.string().url(),
  altText: z.string().optional().nullable(),
  sortOrder: z.number().int(),
});

export const variantSchema = z.object({
  id: z.string().optional(),
  name: z.string().max(255),
  sku: z.string().max(100).optional(),
  price: z.coerce.number().nonnegative(),
  compareAtPrice: z.coerce.number().nonnegative().optional(),
  inventoryQty: z.coerce.number().int().nonnegative(),
  options: z.record(z.string(), z.string()),
});

export const productFormSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().max(255),
  description: z.string().max(10000).optional(),
  price: z.coerce.number().nonnegative(),
  compareAtPrice: z.coerce.number().nonnegative().optional(),
  published: z.boolean(),
  trackInventory: z.boolean(),
  allowBackorders: z.boolean(),
  inventoryQty: z.coerce.number().int().nonnegative().optional(),
  lowInventoryThreshold: z.coerce.number().int().positive().optional(),
  baseInventoryUnitId: z.string().nullable().optional(),
  baseUnitsConsumed: z.coerce.number().int().positive().nullable().optional(),
  variants: z.array(variantSchema).optional(),
  images: z.array(productImageSchema).optional(),
  additionalFields: additionalFieldsSchema,
});

export const productCreateSchema = productFormSchema
  .omit({
    images: true,
  })
  .extend({
    variants: z.array(variantSchema),
  });

export const productUpdateSchema = productFormSchema
  .omit({
    images: true,
  })
  .extend({
    id: z.string(),
    variants: z.array(variantSchema),
  });

export type ProductFormSchema = z.infer<typeof productFormSchema>;
