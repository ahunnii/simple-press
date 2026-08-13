import { z } from "zod";

import { ADMIN_BULK_SELECTION_LIMIT } from "~/lib/validators/admin-table";

/**
 * Most images a single whole-gallery payload may carry — the `create` image
 * list and the `reorderImages` id list.
 *
 * Deliberately NOT `ADMIN_BULK_SELECTION_LIMIT`: that caps a *selection* of rows
 * in an admin table, while these two arrays carry an ENTIRE gallery. Galleries
 * have no size limit of their own, so capping the reorder list at 100 would
 * silently break drag-and-drop on any gallery that grew past it — the reorder
 * client sends every image id in the gallery on each drop.
 *
 * What the cap is actually for is boundedness: `reorderImages` turns each id
 * into its own Prisma update inside one `$transaction`, and `create` fans its
 * list into one `createMany`, so an uncapped array is an uncapped amount of work
 * from a single request. 500 sits far above any gallery a drag-reorder grid
 * stays usable at and far below where either of those becomes a problem. If a
 * gallery ever legitimately exceeds it, raise this constant rather than
 * paginating the reorder.
 */
export const GALLERY_MAX_IMAGES = 500;

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
export const GALLERY_LAYOUT_FILTER_VALUES = [
  "all",
  ...GALLERY_LAYOUT_VALUES,
] as const;
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
  images: z.array(galleryInitialImageSchema).max(GALLERY_MAX_IMAGES).optional(),
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
  // One INCREMENTAL batch, not a whole gallery — so this takes the platform's
  // standard bulk ceiling rather than GALLERY_MAX_IMAGES. Ample headroom: the
  // upload route itself only ever hands back `ROUTE_MAX_FILES.galleryImages`
  // (10) files per request (src/lib/uploads.ts).
  images: z
    .array(
      z.object({
        url: z.string(),
        altText: z.string().max(200).optional(),
        caption: z.string().max(300).optional(),
        width: z.number().optional(),
        height: z.number().optional(),
      }),
    )
    .max(ADMIN_BULK_SELECTION_LIMIT),
});

export const galleryReorderImagesSchema = z.object({
  galleryId: z.string(),
  // Carries EVERY image in the gallery on every drop — see GALLERY_MAX_IMAGES
  // for why this is not the 100-row bulk-selection limit.
  imageIds: z.array(z.string()).max(GALLERY_MAX_IMAGES),
});

export const galleryUpdateImageSchema = z.object({
  id: z.string(),
  altText: z.string().max(200).optional(),
  caption: z.string().max(300).optional(),
});
