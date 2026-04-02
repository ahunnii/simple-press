import { z } from "zod";

export const collectionFormSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  published: z.boolean(),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  imageFile: z.instanceof(File).optional(),
  productIds: z.array(z.string()),
});

export type CollectionFormData = z.infer<typeof collectionFormSchema>;
