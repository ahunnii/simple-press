import { z } from "zod";

export const collectionFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(120, "Name must be 120 characters or fewer"),
  description: z
    .string()
    .max(1000, "Description must be 1000 characters or fewer")
    .optional()
    .nullable(),
  imageUrl: z.string().url().optional().nullable(),
  published: z.boolean(),
  metaTitle: z
    .string()
    .max(70, "Meta title must be 70 characters or fewer")
    .optional()
    .nullable(),
  metaDescription: z
    .string()
    .max(200, "Meta description must be 200 characters or fewer")
    .optional()
    .nullable(),
  metaKeywords: z.string().optional().nullable(),
  ogImage: z.string().url().optional().nullable(),
  imageFile: z.instanceof(File).optional().nullable(),
  productIds: z
    .array(z.string())
    .max(500, "Too many products in one collection"),
});

export type CollectionFormData = z.infer<typeof collectionFormSchema>;

export const collectionCreateSchema = collectionFormSchema.omit({
  imageFile: true,
});

export const collectionUpdateSchema = collectionFormSchema
  .omit({
    imageFile: true,
  })
  .extend({
    id: z.string(),
  });

export const collectionModifyProductSchema = z.object({
  collectionId: z.string(),
  productId: z.string(),
});

export const collectionSetProductsSchema = z.object({
  collectionId: z.string(),
  productIds: z
    .array(z.string())
    .max(500, "Too many products in one collection"),
});

export const collectionBulkPublishSchema = z.object({
  ids: z
    .array(z.string())
    .min(1, "At least one collection id is required")
    .max(1000, "Too many collections selected"),
  published: z.boolean(),
});

export const collectionBulkDeleteSchema = z.object({
  ids: z
    .array(z.string())
    .min(1, "At least one collection id is required")
    .max(1000, "Too many collections selected"),
});
