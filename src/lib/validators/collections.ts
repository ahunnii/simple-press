import { z } from "zod";

export const collectionFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  published: z.boolean(),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  metaKeywords: z.string().optional().nullable(),
  ogImage: z.string().url().optional().nullable(),
  imageFile: z.instanceof(File).optional().nullable(),
  productIds: z.array(z.string()),
});

export type CollectionFormData = z.infer<typeof collectionFormSchema>;

export const collectionCreateSchema = collectionFormSchema.omit({
  imageFile: true,
  productIds: true,
});

export const collectionUpdateSchema = collectionFormSchema
  .omit({
    imageFile: true,
    productIds: true,
  })
  .extend({
    id: z.string(),
  });

export const collectionModifyProductSchema = z.object({
  collectionId: z.string(),
  productId: z.string(),
});

export const collectionProductOrderSchema = z.object({
  collectionId: z.string(),
  productIds: z.array(z.string()),
});

export const collectionCollectionOrderSchema = z.array(z.string());

export const collectionSetProductsSchema = z.object({
  collectionId: z.string(),
  productIds: z.array(z.string()),
});
