import { z } from "zod";

const galleryInitialImageSchema = z.object({
  url: z.string(),
  altText: z.string().max(200).optional(),
  caption: z.string().max(300).optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export const galleryCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z.string().max(1000).optional(),
  layout: z.enum(["grid", "masonry", "carousel", "collage", "justified"]),
  columns: z.number().min(1).max(5),
  gap: z.number().int().min(0).max(64),
  aspectRatio: z.enum(["1:1", "4:3", "16:9", "3:4", "original"]).optional(),
  captionStyle: z.enum(["overlay", "hover", "below"]).optional(),
  showCaptions: z.boolean(),
  enableLightbox: z.boolean(),
  images: z.array(galleryInitialImageSchema).optional(),
});

export const galleryUpdateSchema = galleryCreateSchema
  .omit({ images: true })
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
      altText: z.string().max(200).optional(),
      caption: z.string().max(300).optional(),
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
  altText: z.string().max(200).optional(),
  caption: z.string().max(300).optional(),
});
