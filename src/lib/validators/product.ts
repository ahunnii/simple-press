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
  url: z.string().url("Enter a valid image URL"),
  altText: z.string().optional().nullable(),
  sortOrder: z.number().int("Sort order must be a whole number"),
});

export const variantSchema = z.object({
  id: z.string().optional(),
  name: z.string().max(255, "Name must be 255 characters or fewer"),
  sku: z.string().max(100, "SKU must be 100 characters or fewer").optional(),
  price: z.coerce.number().nonnegative("Price can't be negative"),
  compareAtPrice: z.coerce
    .number()
    .nonnegative("Compare-at price can't be negative")
    .optional(),
  inventoryQty: z.coerce
    .number()
    .int("Quantity must be a whole number")
    .nonnegative("Quantity can't be negative"),
  options: z.record(z.string(), z.string()),
  imageUrl: z.string().url("Enter a valid image URL").optional().nullable(),
});

export const productFormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be 255 characters or fewer"),
  slug: z
    .string()
    .max(255, "Slug must be 255 characters or fewer")
    .regex(
      /^[a-z0-9._~-]+$/i,
      "Use letters, numbers, dots, underscores, tildes, and hyphens",
    ),
  description: z
    .string()
    .max(10000, "Description must be 10,000 characters or fewer")
    .optional(),
  price: z.coerce.number().nonnegative("Price can't be negative"),
  compareAtPrice: z.coerce
    .number()
    .nonnegative("Compare-at price can't be negative")
    .optional(),
  published: z.boolean(),
  // Form-level value: datetime-local string ("" = no schedule). Router schemas
  // override this with a real Date.
  scheduledPublishAt: z.string().optional().nullable(),
  trackInventory: z.boolean(),
  allowBackorders: z.boolean(),
  inventoryQty: z.coerce
    .number()
    .int("Quantity must be a whole number")
    .nonnegative("Quantity can't be negative")
    .optional(),
  lowInventoryThreshold: z.coerce
    .number()
    .int("Low stock threshold must be a whole number")
    .positive("Low stock threshold must be greater than 0")
    .optional(),
  baseInventoryUnitId: z.string().nullable().optional(),
  baseUnitsConsumed: z.coerce
    .number()
    .int("Units consumed must be a whole number")
    .positive("Units consumed must be greater than 0")
    .nullable()
    .optional(),
  variants: z.array(variantSchema).optional(),
  images: z.array(productImageSchema).optional(),
  additionalFields: additionalFieldsSchema,
  metaTitle: z
    .string()
    .max(60, "Meta title must be 60 characters or fewer")
    .optional()
    .nullable(),
  metaDescription: z
    .string()
    .max(160, "Meta description must be 160 characters or fewer")
    .optional()
    .nullable(),
  metaKeywords: z.string().optional().nullable(),
  ogImage: z.string().url("Enter a valid image URL").optional().nullable(),
  weight: z.coerce
    .number()
    .nonnegative("Weight can't be negative")
    .optional()
    .nullable(),
  weightUnit: z.enum(["lb", "kg"]).optional(),
});

export const productCreateSchema = productFormSchema
  .omit({
    images: true,
  })
  .extend({
    variants: z.array(variantSchema),
    weight: z
      .number()
      .nonnegative("Weight can't be negative")
      .nullable()
      .optional(),
    weightUnit: z.enum(["lb", "kg"]).optional(),
    scheduledPublishAt: z.date().nullable().optional(),
  });

export const productUpdateSchema = productFormSchema
  .omit({
    images: true,
  })
  .extend({
    id: z.string(),
    variants: z.array(variantSchema),
    weight: z
      .number()
      .nonnegative("Weight can't be negative")
      .nullable()
      .optional(),
    weightUnit: z.enum(["lb", "kg"]).optional(),
    scheduledPublishAt: z.date().nullable().optional(),
  });

export const productListFiltersSchema = z
  .object({
    search: z.string().optional(),
    status: z.enum(["all", "published", "draft"]).optional(),
    sort: z
      .enum([
        "newest",
        "oldest",
        "name-asc",
        "name-desc",
        "price-asc",
        "price-desc",
      ])
      .optional(),
    page: z
      .number()
      .int("Page must be a whole number")
      .positive("Page must be greater than 0")
      .optional(),
  })
  .optional();

export type ProductFormSchema = z.infer<typeof productFormSchema>;
export type ProductListFiltersSchema = z.infer<typeof productListFiltersSchema>;
