import { z } from "zod";

/**
 * Value tuples for the /admin/galleries list page.
 *
 * One `as const` tuple per URL param, consumed by `pickParam` on the page and
 * `FilterDefFor` for the filter defs. Keep page defaults and these _DEFAULT
 * constants in sync: a UI option missing from a tuple is a type error, and a
 * default that disagrees between page and filter def makes the control appear
 * selected while doing nothing (AdminFilters deletes a param set to its
 * defaultValue). See src/lib/validators/customer.ts for the full write-up of
 * the two failure modes.
 */
export const GALLERY_LAYOUT_VALUES = [
  "grid",
  "masonry",
  "carousel",
  "collage",
  "justified",
] as const;
export type GalleryLayoutValue = (typeof GALLERY_LAYOUT_VALUES)[number];

/** "all" + the model vocabulary; menu order is part of the FilterDefFor check. */
export const GALLERY_LAYOUT_FILTER_VALUES = ["all", ...GALLERY_LAYOUT_VALUES] as const;
export const GALLERY_LAYOUT_FILTER_DEFAULT = "all";

export const GALLERY_SORT_VALUES = [
  "recently-updated", // DEFAULT — preserves the router's `orderBy updatedAt desc`
  "newest",
  "oldest",
  "name-asc",
  "name-desc",
  "most-images",
  "fewest-images",
] as const;
export type GallerySortValue = (typeof GALLERY_SORT_VALUES)[number];
export const GALLERY_SORT_DEFAULT = "recently-updated";

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
  layout: z.enum(GALLERY_LAYOUT_VALUES),
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
