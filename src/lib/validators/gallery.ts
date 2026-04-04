import { z } from "zod";

export const galleryCreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  layout: z.enum(["grid", "masonry", "carousel", "collage", "justified"]),
  columns: z.number().min(1).max(5),
  gap: z.number(),
  aspectRatio: z.string().optional(),
  showCaptions: z.boolean(),
  enableLightbox: z.boolean(),
});

export const galleryUpdateSchema = galleryCreateSchema
  .omit({ slug: true })
  .extend({
    id: z.string(),
  });

export type GalleryCreateData = z.infer<typeof galleryCreateSchema>;
export type GalleryUpdateData = z.infer<typeof galleryUpdateSchema>;

export const galleryImageCreateSchema = z.object({
  galleryId: z.string(),
  images: z.array(
    z.object({
      url: z.string(),
      altText: z.string().optional(),
      caption: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
    }),
  ),
});

export const galleryReorderImagesSchema = z.object({
  galleryId: z.string(),
  imageIds: z.array(z.string()),
});

export const galleryUpdateImageSchema = z.object({
  id: z.string(),
  altText: z.string().optional(),
  caption: z.string().optional(),
});
